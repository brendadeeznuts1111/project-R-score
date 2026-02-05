/**
 * Component #7: CSRF Protector
 *
 * Provides CSRF protection for MCP server endpoints
 * Integrates with Component #41 MCP Server Engine
 */

interface CSRFToken {
  token: string;
  expires: number;
  signature: string;
}

export class CSRFProtector {
  private readonly secret: string;
  private readonly tokenExpiry: number = 60 * 60 * 1000; // 1 hour

  constructor(secret?: string) {
    this.secret =
      secret || crypto.getRandomValues(new Uint8Array(32)).toString();
  }

  async generateToken(): Promise<string> {
    const token = crypto.randomUUID();
    const expires = Date.now() + this.tokenExpiry;
    const signature = await this.signToken(token, expires);

    const csrfData: CSRFToken = { token, expires, signature };
    return btoa(JSON.stringify(csrfData));
  }

  async validateToken(request: Request): Promise<boolean> {
    const token = this.extractToken(request);
    if (!token) return false;

    try {
      const decoded = atob(token);
      const csrfData = JSON.parse(decoded) as CSRFToken;

      // Check expiration
      if (Date.now() > csrfData.expires) {
        return false;
      }

      // Verify signature
      const expectedSignature = await this.signToken(
        csrfData.token,
        csrfData.expires
      );
      if (csrfData.signature !== expectedSignature) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private extractToken(request: Request): string | null {
    // Check header first
    const headerToken = request.headers.get("X-CSRF-Token");
    if (headerToken) return headerToken;

    // Check body for POST requests
    const contentType = request.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      try {
        const body = request.clone();
        const json = await body.json();
        return json.csrfToken || json._csrf || null;
      } catch {
        return null;
      }
    }

    // Check form data
    if (contentType?.includes("application/x-www-form-urlencoded")) {
      try {
        const body = request.clone();
        const formData = await body.formData();
        return (formData.get("csrfToken") as string) || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  private async signToken(token: string, expires: number): Promise<string> {
    const payload = `${token}:${expires}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(this.secret);
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

  // Generate CSRF token for HTML forms
  generateHTMLToken(): string {
    const token = crypto.randomUUID();
    const expires = Date.now() + this.tokenExpiry;
    return `<input type="hidden" name="csrfToken" value="${token}" data-expires="${expires}">`;
  }
}
