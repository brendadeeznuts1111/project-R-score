import { createHash, randomBytes } from "crypto";

export interface CSRFTokenOptions {
  tokenLength: number;
  expiryMinutes: number;
  saltLength: number;
}

export interface CSRFValidationResult {
  valid: boolean;
  reason?: string;
  tokenExpired?: boolean;
  tokenInvalid?: boolean;
  missingToken?: boolean;
}

export class CSRFProtector {
  private readonly options: CSRFTokenOptions;
  private readonly secretKey: string;
  private readonly tokenStore: Map<string, { token: string; expires: number }>;

  constructor(secretKey?: string, options: Partial<CSRFTokenOptions> = {}) {
    this.secretKey = secretKey || this.generateSecretKey();
    this.options = {
      tokenLength: 32,
      expiryMinutes: 60,
      saltLength: 16,
      ...options,
    };
    this.tokenStore = new Map();
  }

  private generateSecretKey(): string {
    return randomBytes(32).toString("hex");
  }

  private generateToken(): string {
    return randomBytes(this.options.tokenLength).toString("hex");
  }

  private generateSalt(): string {
    return randomBytes(this.options.saltLength).toString("hex");
  }

  private hashToken(token: string, salt: string): string {
    return createHash("sha256")
      .update(`${token}:${salt}:${this.secretKey}`)
      .digest("hex");
  }

  generateSessionToken(sessionId: string): string {
    const token = this.generateToken();
    const salt = this.generateSalt();
    const hashedToken = this.hashToken(token, salt);
    const expires = Date.now() + this.options.expiryMinutes * 60 * 1000;

    // Store the actual token for validation (not the hash)
    this.tokenStore.set(sessionId, { token, expires });

    return `${salt}:${hashedToken}`;
  }

  async validateToken(request: Request): Promise<boolean> {
    const result = await this.validateTokenDetailed(request);
    return result.valid;
  }

  async validateTokenDetailed(request: Request): Promise<CSRFValidationResult> {
    // Get token from header
    const headerToken = request.headers.get("x-csrf-token");

    // Get token from form data or request body
    let bodyToken: string | null = null;
    try {
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;
        bodyToken = body.csrfToken as string;
      } else if (contentType?.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        bodyToken = formData.get("csrfToken") as string;
      }
    } catch {
      // If we can't parse the body, continue with header validation
    }

    const token = headerToken || bodyToken;

    if (!token) {
      return { valid: false, missingToken: true, reason: "Missing CSRF token" };
    }

    // Get session ID from cookie or other means
    const sessionId = this.extractSessionId(request);
    if (!sessionId) {
      return { valid: false, reason: "No session found" };
    }

    const storedTokenData = this.tokenStore.get(sessionId);
    if (!storedTokenData) {
      return {
        valid: false,
        tokenInvalid: true,
        reason: "No token stored for session",
      };
    }

    // Check if token has expired
    if (Date.now() > storedTokenData.expires) {
      this.tokenStore.delete(sessionId);
      return { valid: false, tokenExpired: true, reason: "Token expired" };
    }

    // Validate the token
    const [salt, hashedToken] = token.split(":");
    if (!salt || !hashedToken) {
      return {
        valid: false,
        tokenInvalid: true,
        reason: "Invalid token format",
      };
    }

    const expectedHash = this.hashToken(storedTokenData.token, salt);
    if (expectedHash !== hashedToken) {
      return { valid: false, tokenInvalid: true, reason: "Token mismatch" };
    }

    return { valid: true };
  }

  private extractSessionId(request: Request): string | null {
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

    return cookies["session-id"] || null;
  }

  invalidateSession(sessionId: string): void {
    this.tokenStore.delete(sessionId);
  }

  cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [sessionId, tokenData] of Array.from(
      this.tokenStore.entries()
    )) {
      if (now > tokenData.expires) {
        this.tokenStore.delete(sessionId);
      }
    }
  }

  getActiveSessionsCount(): number {
    this.cleanupExpiredTokens();
    return this.tokenStore.size;
  }

  // Middleware function for use with frameworks like Express
  middleware() {
    return async (req: Request, res: Response, next: () => void) => {
      if (req.method === "GET" || req.method === "HEAD") {
        return next();
      }

      const isValid = await this.validateToken(req);
      if (!isValid) {
        throw new Error("CSRF validation failed");
      }

      next();
    };
  }
}
