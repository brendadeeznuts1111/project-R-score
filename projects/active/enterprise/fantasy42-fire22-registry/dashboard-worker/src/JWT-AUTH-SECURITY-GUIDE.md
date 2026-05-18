# 🔐 JWT Authentication Security Best Practices Guide

This guide provides comprehensive security recommendations for implementing and
deploying JWT authentication with Cloudflare Workers.

## 🛡️ Security Overview

JWT authentication provides a stateless way to handle user authentication, but
it requires careful implementation to ensure security. This guide covers
essential security practices for production deployments.

## 🔑 JWT Security Fundamentals

### 1. Secret Key Management

#### ✅ Best Practices

- **Use Strong Secrets**: Minimum 32 characters, mix of uppercase, lowercase,
  numbers, and special characters
- **Environment Variables**: Store secrets in environment variables, never in
  code
- **Regular Rotation**: Change secrets periodically (every 3-6 months)
- **Different Secrets per Environment**: Use different secrets for dev, staging,
  and production

#### ❌ Common Mistakes

- Hardcoding secrets in source code
- Using weak or predictable secrets
- Sharing secrets across environments
- Committing secrets to version control

#### Implementation Example

```typescript
// Good: Environment variable with fallback
const config: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-for-dev-only',
  issuer: 'your-app',
  audience: 'your-api',
  tokenExpiry: 3600,
};

// Bad: Hardcoded secret
const config: AuthConfig = {
  jwtSecret: 'my-secret-key', // ❌ Never do this
  issuer: 'your-app',
  audience: 'your-api',
  tokenExpiry: 3600,
};
```

### 2. Token Configuration

#### ✅ Best Practices

- **Short Expiration**: Use short token lifetimes (15-60 minutes)
- **Refresh Tokens**: Implement refresh tokens for longer sessions
- **Issuer Validation**: Validate the `iss` claim
- **Audience Validation**: Validate the `aud` claim
- **Algorithm Specification**: Always specify the algorithm (`alg` header)

#### Implementation Example

```typescript
interface JWTPayload {
  sub: string;        // Subject (user ID)
  username: string;   // Username
  role: string;       // User role
  iat: number;        // Issued at
  exp: number;        // Expiration
  iss: string;        // Issuer
  aud: string;        // Audience
  jti: string;        // JWT ID (for token revocation)
}

// Enhanced token verification
async verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const [header, payload, signature] = token.split('.');

    // Verify algorithm
    const headerData = JSON.parse(this.base64UrlDecode(header));
    if (headerData.alg !== 'HS256') {
      return null; // Reject unexpected algorithms
    }

    // Verify signature
    const isValid = await this.verifySignature(`${header}.${payload}`, signature);
    if (!isValid) {
      return null;
    }

    // Decode and validate payload
    const payloadData = JSON.parse(this.base64UrlDecode(payload));

    // Validate claims
    if (payloadData.iss !== this.config.issuer) {
      return null; // Invalid issuer
    }

    if (payloadData.aud !== this.config.audience) {
      return null; // Invalid audience
    }

    if (payloadData.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }

    return payloadData;
  } catch {
    return null;
  }
}
```

### 3. Password Security

#### ✅ Best Practices

- **Hash Passwords**: Use bcrypt or Argon2 for password hashing
- **Salt Generation**: Use unique salt per password
- **Strong Password Policies**: Enforce minimum length and complexity
- **Rate Limiting**: Implement login attempt rate limiting

#### Implementation Example

```typescript
import * as bcrypt from 'bcrypt';

class UserService {
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Higher is more secure
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async createUser(username: string, password: string): Promise<User> {
    const hashedPassword = await this.hashPassword(password);

    return {
      id: generateUserId(),
      username,
      password: hashedPassword, // Store hashed password
      role: 'user',
    };
  }
}
```

## 🌐 Network Security

### 1. HTTPS Enforcement

#### ✅ Best Practices

- **HTTPS Only**: Always use HTTPS in production
- **HSTS Headers**: Implement HTTP Strict Transport Security
- **Certificate Validation**: Ensure proper certificate management
- **Mixed Content Prevention**: Prevent HTTP resources on HTTPS pages

#### Implementation Example

```typescript
// Add security headers
const securityHeaders = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'",
};

// Apply headers to responses
function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
```

### 2. CORS Configuration

#### ✅ Best Practices

- **Restrict Origins**: Only allow specific domains
- **Limit Methods**: Only allow necessary HTTP methods
- **Validate Headers**: Only allow necessary headers
- **Credentials Handling**: Be careful with `Access-Control-Allow-Credentials`

#### Implementation Example

```typescript
// Production CORS configuration
const productionCorsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
};

// Development CORS configuration
const developmentCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Environment-based CORS selection
function getCorsHeaders(environment: string): Record<string, string> {
  return environment === 'production'
    ? productionCorsHeaders
    : developmentCorsHeaders;
}
```

## 🚨 Input Validation and Sanitization

### 1. Authentication Input Validation

#### ✅ Best Practices

- **Username Validation**: Validate username format and length
- **Password Validation**: Enforce password complexity requirements
- **Header Validation**: Validate Authorization header format
- **Token Validation**: Validate JWT token structure

#### Implementation Example

```typescript
class InputValidator {
  static validateUsername(username: string): boolean {
    // Username: 3-20 characters, alphanumeric + underscore
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
  }

  static validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateAuthorizationHeader(header: string | null): boolean {
    if (!header) return false;

    // Basic Auth: Basic base64(credentials)
    if (header.startsWith('Basic ')) {
      const credentials = header.slice(6);
      try {
        const decoded = atob(credentials);
        const [username, password] = decoded.split(':', 2);
        return (
          username && password && username.length > 0 && password.length > 0
        );
      } catch {
        return false;
      }
    }

    // Bearer Token: Bearer <token>
    if (header.startsWith('Bearer ')) {
      const token = header.slice(7);
      return token.length > 0 && token.split('.').length === 3;
    }

    return false;
  }
}
```

### 2. Output Encoding

#### ✅ Best Practices

- **JSON Encoding**: Ensure proper JSON serialization
- **XSS Prevention**: Escape user-generated content
- **Error Messages**: Don't expose sensitive information in errors
- **Logging**: Sanitize logged data

#### Implementation Example

```typescript
class SecurityUtils {
  static sanitizeError(error: unknown): string {
    if (error instanceof Error) {
      // Don't expose stack traces in production
      if (process.env.NODE_ENV === 'production') {
        return 'An unexpected error occurred';
      }
      return error.message;
    }
    return 'An unknown error occurred';
  }

  static sanitizeUserData(user: User): Partial<User> {
    // Remove sensitive data before sending to client
    const { password, ...safeUser } = user;
    return safeUser;
  }

  static safeJsonStringify(data: unknown): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return '{}';
    }
  }
}
```

## 🔄 Session Management

### 1. Token Lifecycle Management

#### ✅ Best Practices

- **Short Access Tokens**: 15-60 minute expiration
- **Long Refresh Tokens**: 7-30 day expiration
- **Token Revocation**: Implement token blacklist/whitelist
- **Session Tracking**: Monitor active sessions

#### Implementation Example

```typescript
interface Session {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: Date;
  refreshTokenExpires: Date;
  createdAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();

  async createSession(
    userId: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = generateSessionId();
    const accessToken = await this.generateAccessToken(userId);
    const refreshToken = await this.generateRefreshToken();

    const session: Session = {
      id: sessionId,
      userId,
      accessToken,
      refreshToken,
      accessTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      lastUsed: new Date(),
      isActive: true,
    };

    this.sessions.set(sessionId, session);
    return { accessToken, refreshToken };
  }

  async refreshSession(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const session = Array.from(this.sessions.values()).find(
      s => s.refreshToken === refreshToken && s.isActive
    );

    if (!session || session.refreshTokenExpires < new Date()) {
      return null;
    }

    // Generate new tokens
    const newAccessToken = await this.generateAccessToken(session.userId);
    const newRefreshToken = await this.generateRefreshToken();

    // Update session
    session.accessToken = newAccessToken;
    session.refreshToken = newRefreshToken;
    session.accessTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
    session.lastUsed = new Date();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async revokeSession(accessToken: string): Promise<boolean> {
    const session = Array.from(this.sessions.values()).find(
      s => s.accessToken === accessToken && s.isActive
    );

    if (session) {
      session.isActive = false;
      return true;
    }

    return false;
  }

  private async generateAccessToken(userId: string): Promise<string> {
    // Implementation for access token generation
    return 'access-token';
  }

  private async generateRefreshToken(): Promise<string> {
    // Implementation for refresh token generation
    return 'refresh-token';
  }
}
```

### 2. Rate Limiting

#### ✅ Best Practices

- **Login Attempts**: Limit failed login attempts
- **Token Requests**: Limit token generation requests
- **API Calls**: Implement general rate limiting
- **IP-based Limits**: Limit by IP address

#### Implementation Example

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async isAllowed(key: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.limits.get(key);

    if (!entry || now > entry.resetTime) {
      // New window
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false; // Rate limited
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(key: string): number {
    const entry = this.limits.get(key);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }
}

// Usage in authentication
const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
const tokenRateLimiter = new RateLimiter(100, 60 * 1000); // 100 tokens per minute

async function handleLogin(request: Request): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  if (!(await loginRateLimiter.isAllowed(ip))) {
    return new Response(JSON.stringify({ error: 'Too many login attempts' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '900',
      },
    });
  }

  // Proceed with login logic
  // ...
}
```

## 📊 Monitoring and Logging

### 1. Security Event Logging

#### ✅ Best Practices

- **Authentication Events**: Log successful and failed attempts
- **Token Events**: Log token generation and validation
- **Security Events**: Log suspicious activities
- **PII Protection**: Don't log sensitive information

#### Implementation Example

```typescript
interface SecurityEvent {
  timestamp: Date;
  eventType:
    | 'auth_success'
    | 'auth_failure'
    | 'token_generated'
    | 'token_verified'
    | 'suspicious_activity';
  userId?: string;
  ip: string;
  userAgent?: string;
  details: Record<string, unknown>;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];

  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      timestamp: new Date(),
      ...event,
    };

    this.events.push(securityEvent);

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(securityEvent);
    }

    // Console for development
    if (process.env.NODE_ENV === 'development') {
      console.log('Security Event:', JSON.stringify(securityEvent, null, 2));
    }
  }

  private sendToLoggingService(event: SecurityEvent): void {
    // Implementation for sending to external logging service
    // e.g., Datadog, Splunk, Cloudflare Logs
  }

  getRecentEvents(minutes: number = 60): SecurityEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter(event => event.timestamp > cutoff);
  }
}

// Usage in authentication flow
const securityLogger = new SecurityLogger();

async function handleAuthentication(request: Request): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';

  try {
    const user = await authenticateUser(request);

    securityLogger.logEvent({
      eventType: 'auth_success',
      userId: user.id,
      ip,
      userAgent,
      details: { method: 'basic_auth' },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    securityLogger.logEvent({
      eventType: 'auth_failure',
      ip,
      userAgent,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'basic_auth',
      },
    });

    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### 2. Security Metrics

#### ✅ Best Practices

- **Authentication Success Rate**: Monitor successful vs failed attempts
- **Token Validation Rate**: Track token validation success/failure
- **Rate Limit Hits**: Monitor rate limiting triggers
- **Geographic Anomalies**: Detect unusual geographic patterns

#### Implementation Example

```typescript
interface SecurityMetrics {
  totalAuthAttempts: number;
  successfulAuths: number;
  failedAuths: number;
  tokenGenerations: number;
  tokenValidations: number;
  tokenValidationFailures: number;
  rateLimitHits: number;
  suspiciousActivities: number;
}

class SecurityMonitor {
  private metrics: SecurityMetrics = {
    totalAuthAttempts: 0,
    successfulAuths: 0,
    failedAuths: 0,
    tokenGenerations: 0,
    tokenValidations: 0,
    tokenValidationFailures: 0,
    rateLimitHits: 0,
    suspiciousActivities: 0,
  };

  incrementAuthAttempt(success: boolean): void {
    this.metrics.totalAuthAttempts++;
    if (success) {
      this.metrics.successfulAuths++;
    } else {
      this.metrics.failedAuths++;
    }
  }

  incrementTokenGeneration(): void {
    this.metrics.tokenGenerations++;
  }

  incrementTokenValidation(success: boolean): void {
    this.metrics.tokenValidations++;
    if (!success) {
      this.metrics.tokenValidationFailures++;
    }
  }

  incrementRateLimitHit(): void {
    this.metrics.rateLimitHits++;
  }

  incrementSuspiciousActivity(): void {
    this.metrics.suspiciousActivities++;
  }

  getMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  getAuthSuccessRate(): number {
    if (this.metrics.totalAuthAttempts === 0) return 0;
    return (
      (this.metrics.successfulAuths / this.metrics.totalAuthAttempts) * 100
    );
  }

  getTokenValidationSuccessRate(): number {
    if (this.metrics.tokenValidations === 0) return 0;
    const successRate =
      ((this.metrics.tokenValidations - this.metrics.tokenValidationFailures) /
        this.metrics.tokenValidations) *
      100;
    return successRate;
  }
}
```

## 🚀 Production Deployment Checklist

### Pre-Deployment

- [ ] **Environment Variables**: All secrets moved to environment variables
- [ ] **HTTPS**: HTTPS properly configured with valid certificates
- [ ] **CORS**: CORS restricted to specific domains
- [ ] **Security Headers**: All security headers implemented
- [ ] **Rate Limiting**: Rate limiting configured and tested
- [ ] **Input Validation**: All inputs properly validated
- [ ] **Error Handling**: Secure error handling implemented
- [ ] **Logging**: Security logging configured
- [ ] **Monitoring**: Security metrics and monitoring set up

### Post-Deployment

- [ ] **Penetration Testing**: Conduct security penetration testing
- [ ] **Code Review**: Security-focused code review
- [ ] **Load Testing**: Test under high load conditions
- [ ] **Failover Testing**: Test failover and recovery procedures
- [ ] **Backup Testing**: Verify backup and restore procedures
- [ ] **Incident Response**: Test incident response procedures
- [ ] **Documentation**: Update security documentation
- [ ] **Training**: Security training for development team

### Ongoing Maintenance

- [ ] **Secret Rotation**: Regular secret rotation schedule
- [ ] **Security Updates**: Keep dependencies updated
- [ ] **Monitoring**: Continuous security monitoring
- [ ] **Auditing**: Regular security audits
- [ ] **Testing**: Regular security testing
- [ ] **Documentation**: Keep documentation updated
- [ ] **Training**: Ongoing security training

## 🚨 Common Security Vulnerabilities and Mitigations

### 1. JWT-Specific Vulnerabilities

#### None Algorithm Attack

```typescript
// Vulnerable: Accepting "none" algorithm
if (header.alg === 'none' || header.alg === 'HS256') {
  // Accept token without signature verification
}

// Secure: Only accept specific algorithms
if (header.alg !== 'HS256') {
  return null; // Reject unexpected algorithms
}
```

#### Weak Secret Key

```typescript
// Vulnerable: Weak secret
const secret = 'password123';

// Secure: Strong, randomly generated secret
const secret = crypto.getRandomValues(new Uint8Array(32)).join('');
```

#### Missing Expiration

```typescript
// Vulnerable: No expiration check
const payload = JSON.parse(base64UrlDecode(payloadPart));

// Secure: Check expiration
const payload = JSON.parse(base64UrlDecode(payloadPart));
if (payload.exp < Math.floor(Date.now() / 1000)) {
  return null; // Token expired
}
```

### 2. General Web Security Vulnerabilities

#### Cross-Site Scripting (XSS)

```typescript
// Vulnerable: Direct user input output
res.send(`<div>Welcome ${userInput}</div>`);

// Secure: Escape user input
res.send(`<div>Welcome ${escapeHtml(userInput)}</div>`);
```

#### Cross-Site Request Forgery (CSRF)

```typescript
// Vulnerable: No CSRF protection
app.post('/transfer', (req, res) => {
  // Process transfer
});

// Secure: CSRF token validation
app.post('/transfer', (req, res) => {
  if (!validateCSRFToken(req.body.csrfToken)) {
    return res.status(403).send('Invalid CSRF token');
  }
  // Process transfer
});
```

#### Insecure Direct Object References (IDOR)

```typescript
// Vulnerable: Direct ID access
app.get('/users/:id', (req, res) => {
  const user = getUserById(req.params.id); // Any user can access any user
});

// Secure: Ownership verification
app.get('/users/:id', (req, res) => {
  if (req.params.id !== req.user.id && !req.user.isAdmin) {
    return res.status(403).send('Access denied');
  }
  const user = getUserById(req.params.id);
});
```

## 📚 Additional Resources

### Documentation

- [JWT Specification (RFC 7519)](https://tools.ietf.org/html/rfc7519)
- [OWASP JWT Security Best Practices](https://owasp.org/www-chapter-london/assets/slides/OWASPLondon_JWT_Security_Best_Practices.pdf)
- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/security/)

### Tools

- [JWT.io](https://jwt.io/) - JWT debugger and library recommendations
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing tool
- [Burp Suite](https://portswigger.net/burp) - Security testing platform

### Libraries

- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - Node.js JWT
  library
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Password hashing
  library
- [helmet](https://helmetjs.github.io/) - Security middleware for Express

---

**Remember**: Security is an ongoing process, not a one-time implementation.
Regular security reviews, updates, and testing are essential for maintaining a
secure authentication system.
