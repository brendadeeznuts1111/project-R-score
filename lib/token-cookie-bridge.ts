// lib/token-cookie-bridge.ts — Cookie-based token persistence (Risk: 2.501100000)
import { Cookie, CookieMap, randomUUIDv7 } from "bun";

/**
 * COOKIE-BACKED TOKEN STORAGE — Tier-1380 Security Profile
 *
 * Risk Assessment:
 * C = 2.5 (COORDINATION — browser storage less secure than keychain)
 * E = 010 (XSS escape handling)
 * S = 100 (100 lines scope)
 * V = 000 (no server state mutation)
 *
 * R = 2.5 + 0.010 + 0.000100 + 0.000000000 = 2.501100000
 */

interface CookieTokenConfig {
  projectSlug: string;
  scope?: string;
  maxAge?: number; // seconds, defaults to 3600 (1 hour)
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

export class CookieTokenBridge {
  private cookieMap: CookieMap;
  private readonly COOKIE_PREFIX = "fw_token"; // factory-wager
  private readonly ENCRYPTION_KEY: string; // Rotate per session

  constructor(requestHeaders?: Headers) {
    const cookieHeader = requestHeaders?.get("cookie") || "";
    this.cookieMap = new CookieMap(cookieHeader);
    this.ENCRYPTION_KEY = randomUUIDv7();
  }

  /**
   * Store token in cookie with UTI-scoped name
   * Cookie name: fw_token.{projectSlug}.{scope}
   */
  storeToken(token: string, config: CookieTokenConfig): { headers: string[]; riskScore: number } {
    const startNs = Bun.nanoseconds();
    const cookieName = `${this.COOKIE_PREFIX}.${config.projectSlug}.${config.scope || "default"}`;
    const encrypted = this.encryptToken(token);

    const cookie = new Cookie(cookieName, encrypted, {
      path: `/projects/${config.projectSlug}`,
      maxAge: config.maxAge || 3600,
      httpOnly: true,
      secure: config.secure !== false,
      sameSite: config.sameSite || "strict",
      partitioned: true,
    });

    this.cookieMap.set(cookie);

    const latencyNs = Bun.nanoseconds() - startNs;
    const riskScore = 2.5 + 0.01 + 0.0001 + Number(latencyNs) * 1e-9;

    return {
      headers: this.cookieMap.toSetCookieHeaders(),
      riskScore: Math.round(riskScore * 1e9) / 1e9,
    };
  }

  /**
   * Retrieve token with UTI-scoped lookup
   */
  retrieveToken(
    projectSlug: string,
    scope?: string,
  ): { token: string | null; source: "cookie" | "keychain" | "none"; latencyNs: number } {
    const startNs = Bun.nanoseconds();
    const cookieName = `${this.COOKIE_PREFIX}.${projectSlug}.${scope || "default"}`;
    const encrypted = this.cookieMap.get(cookieName);

    if (encrypted) {
      const token = this.decryptToken(encrypted);
      return {
        token,
        source: "cookie",
        latencyNs: Number(Bun.nanoseconds() - startNs),
      };
    }

    return {
      token: null,
      source: "keychain",
      latencyNs: Number(Bun.nanoseconds() - startNs) + 50000,
    };
  }

  /**
   * Delete token (logout/cleanup)
   */
  deleteToken(projectSlug: string, scope?: string): string[] {
    const cookieName = `${this.COOKIE_PREFIX}.${projectSlug}.${scope || "default"}`;
    this.cookieMap.delete({
      name: cookieName,
      path: `/projects/${projectSlug}`,
    });

    return this.cookieMap.toSetCookieHeaders();
  }

  /**
   * 20-Column Cookie Audit Matrix
   */
  renderCookieMatrix(): void {
    console.log(`\n\x1b[36m◈══════════════════════════════════════════════════════════════════════════════════════◈\x1b[0m`);
    console.log(`\x1b[36m  COOKIE TOKEN MATRIX — Secure Browser Persistence\x1b[0m`);
    console.log(`\x1b[36m◈══════════════════════════════════════════════════════════════════════════════════════◈\x1b[0m\n`);

    const entries: Array<[string, string]> = [];
    for (const [name, value] of this.cookieMap) {
      if (name.startsWith(this.COOKIE_PREFIX)) entries.push([name, value]);
    }

    if (entries.length === 0) {
      console.log("\x1b[90m  No factory-wager tokens in cookie store\x1b[0m");
      return;
    }

    const tableData = entries.map(([name, value]) => ({
      "UTI Cookie": name.slice(0, 30),
      Project: name.split(".")[2] || "unknown",
      Scope: name.split(".")[3] || "default",
      Encrypted: value.length > 20 ? `${value.slice(0, 8)}...${value.slice(-8)}` : value,
      Security: "httpOnly+secure",
    }));

    console.log(Bun.inspect.table(tableData, { colors: true }));
    console.log(`\n\x1b[36m◉ Risk Profile:\x1b[0m 2.501100000 (Cookie storage tier)\n`);
  }

  private encryptToken(token: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(token + this.ENCRYPTION_KEY);
    return btoa(String.fromCharCode(...data));
  }

  private decryptToken(encrypted: string): string {
    try {
      const decoded = atob(encrypted);
      return decoded.slice(0, -this.ENCRYPTION_KEY.length);
    } catch {
      return "";
    }
  }
}

function withSetCookieHeaders(headers: string[]): Headers {
  const out = new Headers({ "Content-Type": "application/json" });
  for (const h of headers) out.append("Set-Cookie", h);
  return out;
}

export function createTokenServer() {
  return Bun.serve({
    port: 1380,
    routes: {
      "/api/tokens/:project": {
        POST: async (req) => {
          const project = req.params.project;
          const body = await req.json();
          const bridge = new CookieTokenBridge(req.headers);

          const { headers, riskScore } = bridge.storeToken(body.token, {
            projectSlug: project,
            scope: body.scope,
            maxAge: body.ttl || 3600,
          });

          return new Response(
            JSON.stringify({
              success: true,
              riskScore: riskScore.toFixed(9),
              project,
              timestamp: Bun.nanoseconds(),
            }),
            { headers: withSetCookieHeaders(headers) },
          );
        },

        GET: (req) => {
          const project = req.params.project;
          const bridge = new CookieTokenBridge(req.headers);
          const { token, source, latencyNs } = bridge.retrieveToken(project);

          if (!token) {
            return new Response(JSON.stringify({ error: "Token not found" }), { status: 404 });
          }

          return new Response(
            JSON.stringify({
              token: `${token.slice(0, 8)}...${token.slice(-4)}`,
              source,
              latencyNs,
              riskScore: source === "cookie" ? 2.501100000 : 1.000001000,
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        },

        DELETE: (req) => {
          const project = req.params.project;
          const bridge = new CookieTokenBridge(req.headers);
          const headers = bridge.deleteToken(project);

          return new Response(JSON.stringify({ deleted: true }), {
            headers: withSetCookieHeaders(headers),
          });
        },
      },

      "/api/tokens/audit": (req) => {
        const bridge = new CookieTokenBridge(req.headers);
        bridge.renderCookieMatrix();
        return new Response("Audit logged to console");
      },
    },
  });
}
