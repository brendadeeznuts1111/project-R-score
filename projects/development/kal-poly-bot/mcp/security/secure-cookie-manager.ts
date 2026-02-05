/**
 * Component #5: Secure Cookie Manager
 *
 * Provides secure cookie management for MCP server
 * Integrates with Component #41 MCP Server Engine
 */

interface SecureCookieOptions {
  secret: string;
  domain: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
}

interface CookieData {
  sessionId: string;
  userId?: string;
  expires: number;
  signature: string;
}

export class SecureCookieManager {
  private options: SecureCookieOptions;

  constructor(options: SecureCookieOptions) {
    this.options = {
      secure: true,
      httpOnly: true,
      sameSite: "strict",
      ...options,
    };
  }

  async getSecureCookie(
    request: Request,
    cookieName: string
  ): Promise<CookieData | null> {
    const cookieHeader = request.headers.get("Cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const targetCookie = cookies.find((c) => c.startsWith(`${cookieName}=`));

    if (!targetCookie) return null;

    const cookieValue = targetCookie.substring(cookieName.length + 1);

    try {
      // Decode and verify the cookie
      const decoded = atob(cookieValue);
      const data = JSON.parse(decoded) as CookieData;

      // Verify signature
      const expectedSignature = await this.signCookieData(data);
      if (data.signature !== expectedSignature) {
        return null; // Invalid signature
      }

      // Check expiration
      if (Date.now() > data.expires) {
        return null; // Expired
      }

      return data;
    } catch {
      return null;
    }
  }

  async createSecureCookie(
    data: Omit<CookieData, "signature">
  ): Promise<string> {
    const cookieData: CookieData = {
      ...data,
      expires: data.expires || Date.now() + 24 * 60 * 60 * 1000, // 24 hours default
      signature: "",
    };

    cookieData.signature = await this.signCookieData(cookieData);

    const encoded = btoa(JSON.stringify(cookieData));
    return `${this.options.domain ? `Domain=${this.options.domain}; ` : ""}Path=/; ${this.options.secure ? "Secure; " : ""}${this.options.httpOnly ? "HttpOnly; " : ""}SameSite=${this.options.sameSite}; Expires=${new Date(cookieData.expires).toUTCString()}`;
  }

  private async signCookieData(
    data: Omit<CookieData, "signature">
  ): Promise<string> {
    const payload = JSON.stringify(data);
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.options.secret);
    const messageData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, messageData);
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
  }

  generateSessionId(): string {
    return crypto.randomUUID();
  }
}
