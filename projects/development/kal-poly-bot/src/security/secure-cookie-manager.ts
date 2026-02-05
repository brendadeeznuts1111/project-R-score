import { randomBytes } from "crypto";

export interface SecureCookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  maxAge: number;
  domain?: string;
  path?: string;
}

export class SecureCookieManager {
  private readonly defaultOptions: SecureCookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: "/",
  };

  private readonly secretKey: string;

  constructor(secretKey?: string) {
    this.secretKey = secretKey || this.generateSecretKey();
  }

  private generateSecretKey(): string {
    return randomBytes(32).toString("hex");
  }

  private signCookie(value: string): string {
    const timestamp = Date.now().toString();
    const signature = this.hmacSha256(`${value}:${timestamp}`, this.secretKey);
    return `${value}:${timestamp}:${signature}`;
  }

  private verifyCookie(signedValue: string): string | null {
    const parts = signedValue.split(":");
    if (parts.length !== 3) return null;

    const [value, timestamp, signature] = parts;
    const expectedSignature = this.hmacSha256(
      `${value}:${timestamp}`,
      this.secretKey
    );

    if (signature !== expectedSignature) return null;

    // Check if cookie is expired (24 hours)
    const age = Date.now() - parseInt(timestamp);
    if (age > this.defaultOptions.maxAge) return null;

    return value;
  }

  private hmacSha256(data: string, key: string): string {
    const crypto = require("crypto");
    return crypto.createHmac("sha256", key).update(data).digest("hex");
  }

  async setSecureCookie(
    response: Response,
    name: string,
    value: string,
    options: Partial<SecureCookieOptions> = {}
  ): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const signedValue = this.signCookie(value);

    let cookieString = `${name}=${signedValue}`;

    if (mergedOptions.httpOnly) cookieString += "; HttpOnly";
    if (mergedOptions.secure) cookieString += "; Secure";
    if (mergedOptions.sameSite)
      cookieString += `; SameSite=${mergedOptions.sameSite}`;
    if (mergedOptions.maxAge)
      cookieString += `; Max-Age=${Math.floor(mergedOptions.maxAge / 1000)}`;
    if (mergedOptions.domain)
      cookieString += `; Domain=${mergedOptions.domain}`;
    if (mergedOptions.path) cookieString += `; Path=${mergedOptions.path}`;

    // Note: In a real implementation, you'd set this on the response headers
    // For now, we'll store it in a map for demonstration
    console.log(`Setting cookie: ${cookieString}`);
  }

  async getSecureCookie(
    request: Request,
    name: string
  ): Promise<string | null> {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [key, value] = cookie.trim().split("=");
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    const signedValue = cookies[name];
    if (!signedValue) return null;

    return this.verifyCookie(signedValue);
  }

  async deleteSecureCookie(
    response: Response,
    name: string,
    options: Partial<SecureCookieOptions> = {}
  ): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options, maxAge: 0 };
    await this.setSecureCookie(response, name, "", mergedOptions);
  }

  generateCSRFToken(): string {
    return randomBytes(32).toString("hex");
  }

  async validateCSRFToken(request: Request, token: string): Promise<boolean> {
    const sessionToken = await this.getSecureCookie(request, "csrf-token");
    return sessionToken === token;
  }

  async verifySession(cookieHeader: string): Promise<any | null> {
    // Mock session verification - in real implementation, this would decode and validate JWT or session data
    if (!cookieHeader || cookieHeader.length < 10) {
      return null;
    }

    // Extract session data from cookie (simplified)
    const sessionMatch = cookieHeader.match(/session=([^;]+)/);
    if (!sessionMatch) return null;

    const sessionData = this.verifyCookie(sessionMatch[1]);
    if (!sessionData) return null;

    try {
      // Parse session JSON
      const session = JSON.parse(sessionData);
      if (session.expires && session.expires < Date.now()) {
        return null; // Session expired
      }
      return session;
    } catch {
      return null;
    }
  }
}
