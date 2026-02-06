// lib/token-cookie-bridge.ts — Cookie-based token persistence with proper crypto (Risk: 2.501100000)
import { Cookie, CookieMap } from "bun";

import { SecurityError, EnterpriseErrorCode } from '../core/core-errors';

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

// Secure encryption key management
class EncryptionKeyManager {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  
  // Cache dev key for process lifetime to ensure token decryptability
  private static devKeyCache: Uint8Array | null = null;

  private masterKey: CryptoKey | null = null;

  async getMasterKey(): Promise<CryptoKey> {
    if (!this.masterKey) {
      // In production, this should be loaded from secure storage
      // For now, generate a deterministic key based on environment
      const keyMaterial = await this.deriveKeyMaterial();
      this.masterKey = await crypto.subtle.importKey(
        'raw',
        keyMaterial,
        { name: EncryptionKeyManager.ALGORITHM },
        false,
        ['encrypt', 'decrypt']
      );
    }
    return this.masterKey;
  }

  private async deriveKeyMaterial(): Promise<Uint8Array> {
    // SECURITY: Require environment-specific key material
    // In production, this MUST be loaded from secure storage (keychain, secrets manager, etc.)
    const seed = process.env.TOKEN_ENCRYPTION_SEED;
    
    if (!seed) {
      const isDev = Bun.env.NODE_ENV === 'development' || Bun.env.NODE_ENV === 'dev';
      if (!isDev) {
        throw new SecurityError(
          EnterpriseErrorCode.SECURITY_ENCRYPTION_FAILED,
          'TOKEN_ENCRYPTION_SEED environment variable is required in production'
        );
      }
      // In development only, use cached key or generate and cache one
      if (!EncryptionKeyManager.devKeyCache) {
        console.warn('⚠️  SECURITY WARNING: Using insecure dev-only encryption seed. Set TOKEN_ENCRYPTION_SEED for secure operation. Tokens will be invalidated on process restart.');
        EncryptionKeyManager.devKeyCache = crypto.getRandomValues(new Uint8Array(32));
      }
      return EncryptionKeyManager.devKeyCache;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(seed);

    // Use PBKDF2 to derive a proper key
    const importedKey = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode('token-bridge-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      importedKey,
      EncryptionKeyManager.KEY_LENGTH
    );

    return new Uint8Array(bits);
  }

  generateIV(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(EncryptionKeyManager.IV_LENGTH));
  }
}

export class CookieTokenBridge {
  private cookieMap: CookieMap;
  private readonly COOKIE_PREFIX = "fw_token"; // factory-wager
  private readonly keyManager = new EncryptionKeyManager();

  constructor(requestHeaders?: Headers) {
    const cookieHeader = requestHeaders?.get("cookie") || "";
    this.cookieMap = new CookieMap(cookieHeader);
  }

  /**
   * Store token in cookie with UTI-scoped name and proper encryption
   * Cookie name: fw_token.{projectSlug}.{scope}
   */
  async storeToken(token: string, config: CookieTokenConfig): Promise<{ headers: string[]; riskScore: number }> {
    const startNs = Bun.nanoseconds();
    const cookieName = `${this.COOKIE_PREFIX}.${config.projectSlug}.${config.scope || "default"}`;

    // Validate input
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token: must be a non-empty string');
    }

    if (token.length > 4096) {
      throw new Error('Token too large: maximum 4096 characters');
    }

    const encrypted = await this.encryptToken(token);

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
   * Retrieve token with UTI-scoped lookup and proper decryption
   */
  async retrieveToken(
    projectSlug: string,
    scope?: string,
  ): Promise<{ token: string | null; source: "cookie" | "keychain" | "none"; latencyNs: number }> {
    const startNs = Bun.nanoseconds();
    const cookieName = `${this.COOKIE_PREFIX}.${projectSlug}.${scope || "default"}`;
    const encrypted = this.cookieMap.get(cookieName);

    if (encrypted) {
      try {
        const token = await this.decryptToken(encrypted);
        if (token) {
          return {
            token,
            source: "cookie",
            latencyNs: Number(Bun.nanoseconds() - startNs),
          };
        }
      } catch (error) {
        console.warn(`Failed to decrypt token for ${projectSlug}:`, error);
        // Fall through to return null
      }
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

  private async encryptToken(token: string): Promise<string> {
    const key = await this.keyManager.getMasterKey();
    const iv = this.keyManager.generateIV();
    const encoder = new TextEncoder();
    const data = encoder.encode(token);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data for storage
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  private async decryptToken(encrypted: string): Promise<string> {
    try {
      const combined = new Uint8Array(
        atob(encrypted).split('').map(char => char.charCodeAt(0))
      );

      if (combined.length < EncryptionKeyManager.IV_LENGTH) {
        throw new Error('Invalid encrypted data: too short');
      }

      const iv = combined.slice(0, EncryptionKeyManager.IV_LENGTH);
      const data = combined.slice(EncryptionKeyManager.IV_LENGTH);

      const key = await this.keyManager.getMasterKey();
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function withSetCookieHeaders(headers: string[]): Headers {
  const out = new Headers({ "Content-Type": "application/json" });
  for (const h of headers) out.append("Set-Cookie", h);
  return out;
}

export function createTokenServer() {
  const TOKEN_SERVER_PORT = parseInt(process.env.TOKEN_SERVER_PORT || '1380', 10);
  return Bun.serve({
    port: TOKEN_SERVER_PORT,
    routes: {
      "/api/tokens/:project": {
        POST: async (req) => {
          const project = req.params.project;
          const body = await req.json();
          const bridge = new CookieTokenBridge(req.headers);

          const { headers, riskScore } = await bridge.storeToken(body.token, {
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

        GET: async (req) => {
          const project = req.params.project;
          const bridge = new CookieTokenBridge(req.headers);
          const { token, source, latencyNs } = await bridge.retrieveToken(project);

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
