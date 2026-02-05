// infrastructure/websocket-cookie-fix.ts
import { feature } from "bun:bundle";

// Set-Cookie header in 101 upgrade response
export class WebSocketCookieFix {
  // Zero-cost when WS_COOKIE_FIX is disabled
  static upgradeWithCookies(
    req: Request,
    server: any,
    cookies: Record<string, string>
  ): boolean {
    if (!feature("WS_COOKIE_FIX")) {
      // Legacy: cookies ignored
      return server.upgrade(req);
    }

    // Component #83: Include Set-Cookie in upgrade response
    const upgradeHeaders: Record<string, string> = {
      "Upgrade": "websocket",
      "Connection": "Upgrade"
    };

    // Add all cookies
    for (const [name, value] of Object.entries(cookies)) {
      upgradeHeaders["Set-Cookie"] = `${name}=${value}; Path=/; HttpOnly`;
    }

    return server.upgrade(req, {
      headers: upgradeHeaders
    });
  }

  // Client-side cookie handling
  static onWebSocketUpgrade(response: Response): Map<string, string> {
    if (!feature("WS_COOKIE_FIX")) {
      return new Map();
    }

    const cookies = new Map<string, string>();

    const setCookie = response.headers.get("Set-Cookie");
    if (setCookie) {
      const [name, value] = setCookie.split(";")[0].split("=");
      cookies.set(name, value);

      // Component #12: Security audit for websocket cookies
      this.auditWebSocketCookie(name, value);
    }

    return cookies;
  }

  private static auditWebSocketCookie(name: string, value: string): void {
    if (!feature("THREAT_INTEL")) return;

    // Check for sensitive cookie names
    const sensitiveNames = ["session", "auth", "token"];
    if (sensitiveNames.some(n => name.toLowerCase().includes(n))) {
      fetch("https://api.buncatalog.com/v1/threat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          component: 83,
          threatType: "sensitive_websocket_cookie",
          cookieName: name,
          timestamp: Date.now()
        })
      }).catch(() => {});
    }
  }
}

// Zero-cost export
export const { upgradeWithCookies, onWebSocketUpgrade } = feature("WS_COOKIE_FIX")
  ? WebSocketCookieFix
  : {
      upgradeWithCookies: (r: Request, s: any) => s.upgrade(r),
      onWebSocketUpgrade: () => new Map()
    };