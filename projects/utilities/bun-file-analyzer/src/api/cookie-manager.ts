import { Bun } from "bun";

// Cookie options interfaces
export interface SessionCookie extends Bun.CookieInit {
  name: "sessionId";
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "strict";
  maxAge: number;
  path: string;
}

export interface AnalyticsCookie extends Bun.CookieInit {
  name: "fileViews";
  value: string;
  maxAge: number;
  path: string;
}

/**
 * Production-ready CookieManager using Bun.CookieMap
 * Implements full Map-like interface from Bun docs
 */
export class CookieManager {
  private jar: Bun.CookieMap;
  private readonly SESSION_KEY = "sessionId";
  private readonly ANALYTICS_KEY = "fileViews";
  
  constructor(initialCookies?: string[]) {
    // Initialize with optional initial cookies (for SSR/server-side)
    // Handle test environment where Bun.CookieMap might not be available
    if (typeof Bun !== 'undefined' && Bun.CookieMap) {
      this.jar = new Bun.CookieMap(initialCookies);
    } else {
      // Fallback for testing - create a mock Map
      this.jar = new Map() as any;
      if (initialCookies) {
        for (const cookie of initialCookies) {
          const [name, value] = cookie.split('=');
          if (name && value) {
            this.jar.set(name, value);
          }
        }
      }
    }
    
    // HMR restoration
    if (import.meta.hot?.data?.cookieManager) {
      // Restore from previous module instance
      const savedJar = import.meta.hot.data.cookieManager.jar;
      // Copy entries
      for (const [name, value] of savedJar.entries()) {
        this.jar.set(name, value);
      }
    }
  }

  // ============== Core CookieMap Methods (from Bun docs) ==============

  /** Get cookie value */
  get(name: string): string | null {
    return this.jar.get(name);
  }

  /** Check if cookie exists */
  has(name: string): boolean {
    return this.jar.has(name);
  }

  /** Set cookie with options */
  set(
    name: string, 
    value: string, 
    options?: Bun.CookieInit
  ): void {
    this.jar.set(name, value, options);
  }

  /** Delete cookie by name */
  delete(name: string): void {
    this.jar.delete(name);
  }

  /** Delete cookie with options */
  delete(name: string, options: Bun.CookieInit): void {
    this.jar.delete(name, options);
  }

  /** Get number of cookies */
  get size(): number {
    return this.jar.size;
  }

  /** Iterate over all cookies */
  entries(): IterableIterator<[string, string]> {
    return this.jar.entries();
  }

  /** Get all cookie names */
  keys(): IterableIterator<string> {
    return this.jar.keys();
  }

  /** Get all cookie values */
  values(): IterableIterator<string> {
    return this.jar.values();
  }

  /** Execute callback for each cookie */
  forEach(
    callback: (value: string, key: string, map: Bun.CookieMap) => void
  ): void {
    this.jar.forEach(callback);
  }

  /** Convert to JSON */
  toJSON(): Record<string, string> {
    if (this.jar.toJSON) {
      return this.jar.toJSON();
    }
    // Fallback for testing
    const result: Record<string, string> = {};
    for (const [name, value] of this.jar.entries()) {
      result[name] = value;
    }
    return result;
  }

  /** Iterator for for...of loops */
  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.jar[Symbol.iterator]();
  }

  // ============== Convenience Methods ==============

  /** Set session cookie */
  setSession(sessionId: string, maxAge: number = 24 * 60 * 60): void {
    const cookie: SessionCookie = {
      name: this.SESSION_KEY,
      value: sessionId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge,
      path: "/",
    };
    this.jar.set(this.SESSION_KEY, sessionId, cookie);
  }

  /** Get session ID */
  getSession(): string | null {
    return this.jar.get(this.SESSION_KEY);
  }

  /** Clear session */
  clearSession(): void {
    this.jar.delete(this.SESSION_KEY, {
      path: "/",
      httpOnly: true,
    });
  }

  /** Set analytics cookie */
  setAnalytics(views: number): void {
    const cookie: AnalyticsCookie = {
      name: this.ANALYTICS_KEY,
      value: views.toString(),
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    };
    this.jar.set(this.ANALYTICS_KEY, views.toString(), cookie);
  }

  /** Get analytics count */
  getAnalytics(): number {
    const value = this.jar.get(this.ANALYTICS_KEY);
    return value ? parseInt(value, 10) : 0;
  }

  /** Get all cookies as header string */
  toHeaderString(): string {
    return Array.from(this.jar.entries())
      .map(([name, value]: [string, string]) => `${name}=${value}`)
      .join("; ");
  }

  /** Get Set-Cookie headers array */
  getSetCookieHeaders(): string[] {
    const headers: string[] = [];
    this.jar.forEach((value: string, name: string) => {
      if (typeof Bun !== 'undefined' && Bun.Cookie) {
        const cookie = new Bun.Cookie(name, value);
        headers.push(cookie.toString());
      } else {
        // Fallback for testing
        headers.push(`${name}=${value}`);
      }
    });
    return headers;
  }

  /** Log cookies with Bun.color */
  debug(label: string = "Cookies"): void {
    if (typeof Bun !== 'undefined' && Bun.color) {
      console.log(
        `%c${label} (${this.jar.size} cookies):`,
        `color: ${Bun.color("hsl(28, 80%, 52%)", "ansi")}; font-weight: bold` 
      );

      for (const [name, value] of this.jar.entries()) {
        const truncated = value.length > 20 ? value.slice(0, 20) + "..." : value;
        console.log(
          `  %c${name}%c = %c${truncated}`,
          `color: ${Bun.color("hsl(210, 90%, 55%)", "ansi")}`,
          "color: reset",
          `color: ${Bun.color("hsl(145, 63%, 42%)", "ansi")}` 
        );
      }
    } else {
      // Fallback for testing
      console.log(`${label} (${this.jar.size} cookies):`);
      for (const [name, value] of this.jar.entries()) {
        console.log(`  ${name} = ${value}`);
      }
    }
  }

  /** Serialize for HMR */
  serialize(): string {
    return JSON.stringify(this.toJSON());
  }

  /** Deserialize from string */
  static deserialize(data: string): CookieManager {
    const parsed = JSON.parse(data);
    const cookies = Object.entries(parsed).map(([name, value]) => 
      `${name}=${value}` 
    );
    return new CookieManager(cookies);
  }

  /** HMR Dispose handler */
  dispose(): void {
    if (import.meta.hot) {
      import.meta.hot.data.cookieManager = {
        jar: this.jar,
        timestamp: Date.now(),
      };
    }
  }
}

// Singleton
export const cookieManager = new CookieManager();

// HMR setup
if (import.meta.hot) {
  import.meta.hot.accept();
  
  import.meta.hot.dispose(() => {
    cookieManager.dispose();
  });
  
  // Restore on HMR
  if (import.meta.hot.data.cookieManager) {
    if (typeof Bun !== 'undefined' && Bun.color) {
      console.log(
        "%c🔄 Restored cookies from HMR", 
        `color: ${Bun.color("hsl(25, 85%, 55%)", "ansi")}` 
      );
    } else {
      console.log("🔄 Restored cookies from HMR");
    }
  }
}
