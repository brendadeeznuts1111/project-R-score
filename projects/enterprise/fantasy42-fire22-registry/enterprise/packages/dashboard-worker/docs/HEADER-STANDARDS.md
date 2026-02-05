# 🔐 Fire22 Header Standards & Security Guidelines

## 📋 Table of Contents

- [Overview](#overview)
- [JWT Headers](#jwt-headers)
- [HTTP Security Headers](#http-security-headers)
- [Custom Headers](#custom-headers)
- [HTML Meta Headers](#html-meta-headers)
- [Implementation Standards](#implementation-standards)
- [Security Compliance](#security-compliance)
- [Testing & Validation](#testing--validation)

## 🎯 Overview

This document defines the comprehensive header standards for the Fire22 system,
ensuring consistent security, performance, and compliance across all components.

### 🔑 Key Principles

- **Security First**: All headers must enhance security posture
- **Consistency**: Standardized header usage across all endpoints
- **Performance**: Headers should optimize caching and delivery
- **Compliance**: Meet industry security standards (OWASP, NIST)
- **Monitoring**: All headers are logged and audited

## 🎫 JWT Headers

### Standard JWT Header Structure

```typescript
interface JWTHeader {
  alg: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512';
  typ: 'JWT';
  kid?: string; // Key ID for key rotation
  x5t?: string; // X.509 Certificate Thumbprint
  cty?: string; // Content Type (for nested JWTs)
  crit?: string[]; // Critical header parameters
}
```

### Enhanced JWT Implementation

```typescript
// Enhanced JWT header with security features
private createEnhancedHeader(): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    kid: this.getCurrentKeyId(),           // Key rotation support
    x5t: this.getCertificateThumbprint(), // Certificate validation
    cty: 'application/json',               // Content type specification
    crit: ['kid', 'x5t'],                 // Critical parameters
    iss: this.config.issuer,              // Issuer claim
    aud: this.config.audience,            // Audience claim
    iat: Math.floor(Date.now() / 1000),   // Issued at timestamp
    exp: Math.floor(Date.now() / 1000) + this.config.tokenExpiry, // Expiration
    nbf: Math.floor(Date.now() / 1000),   // Not before timestamp
    jti: crypto.randomUUID(),             // JWT ID for uniqueness
  };

  return this.base64UrlEncode(JSON.stringify(header));
}
```

### JWT Header Standards

| Field  | Required | Description               | Security Level |
| ------ | -------- | ------------------------- | -------------- |
| `alg`  | ✅       | Algorithm (HS256 minimum) | High           |
| `typ`  | ✅       | Type (JWT)                | Medium         |
| `kid`  | 🔒       | Key ID for rotation       | High           |
| `x5t`  | 🔒       | Certificate thumbprint    | High           |
| `cty`  | 🔒       | Content type              | Medium         |
| `crit` | 🔒       | Critical parameters       | High           |
| `iss`  | 🔒       | Issuer validation         | High           |
| `aud`  | 🔒       | Audience validation       | High           |
| `iat`  | ✅       | Issued timestamp          | Medium         |
| `exp`  | ✅       | Expiration timestamp      | High           |
| `nbf`  | 🔒       | Not before timestamp      | Medium         |
| `jti`  | ✅       | JWT ID (unique)           | High           |

## 🛡️ HTTP Security Headers

### Mandatory Security Headers

```typescript
const MANDATORY_SECURITY_HEADERS = {
  // Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Content Security
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.fire22.com; frame-ancestors 'none';",

  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy
  'Permissions-Policy':
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',

  // Cache Control
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',

  // Security Headers
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-Download-Options': 'noopen',
  'X-DNS-Prefetch-Control': 'off',

  // Custom Security
  'X-Fire22-Security': 'enhanced',
  'X-Content-Security': 'strict',
  'X-Frame-Security': 'deny-all',
};
```

### Environment-Specific Headers

```typescript
// Production Security Headers
const PRODUCTION_SECURITY_HEADERS = {
  ...MANDATORY_SECURITY_HEADERS,
  'Strict-Transport-Security':
    'max-age=31536000; includeSubDomains; preload; hsts-report-uri=https://report.fire22.com/hsts',
  'Content-Security-Policy-Report-Only':
    "default-src 'self'; report-uri https://report.fire22.com/csp",
  'Public-Key-Pins':
    'pin-sha256="base64+primary=="; pin-sha256="base64+backup=="; max-age=5184000; includeSubDomains',
};

// Development Security Headers
const DEVELOPMENT_SECURITY_HEADERS = {
  ...MANDATORY_SECURITY_HEADERS,
  'Content-Security-Policy':
    "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
  'X-Fire22-Environment': 'development',
  'X-Fire22-Debug': 'enabled',
};
```

### CORS Headers

```typescript
const CORS_HEADERS = {
  // Production CORS
  'Access-Control-Allow-Origin': 'https://dashboard.fire22.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, X-Fire22-Version, X-Fire22-Build, X-Fire22-Security, X-Request-ID, X-CSRF-Token',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Expose-Headers':
    'X-Fire22-Version, X-Fire22-Build, X-Request-ID, X-Rate-Limit-Remaining, X-Rate-Limit-Reset',

  // Development CORS
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods':
    'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With, X-Fire22-Version, X-Fire22-Build, X-Fire22-Security, X-Request-ID, X-CSRF-Token, X-Fire22-Debug',
  'Access-Control-Allow-Credentials': 'false',
  'Access-Control-Max-Age': '86400',
};
```

## 🏷️ Custom Headers

### Fire22 System Headers

```typescript
const FIRE22_SYSTEM_HEADERS = `{
  // Version & Build
  'X-Fire22-Version': '3.0.9',
  'X-Fire22-Build': '2024.08.27.001',
  'X-Fire22-Environment': 'production',
  
  // Security & Authentication
  'X-Fire22-Security': 'enhanced',
  'X-Fire22-Auth-Level': 'jwt-enhanced',
  'X-Fire22-Session-ID': 'session_uuid',
  
  // Request Tracking
  'X-Request-ID': 'req_timestamp_uuid',
  'X-Correlation-ID': 'corr_uuid',
  'X-Trace-ID': 'trace_uuid',
  
  // Performance & Caching
  'X-Fire22-Cache': 'miss|hit|stale',
  'X-Fire22-Cache-TTL': '3600',
  'X-Fire22-Response-Time': '45ms',
  
  // Rate Limiting
  'X-Rate-Limit-Limit': '100',
  'X-Rate-Limit-Remaining': '95',
  'X-Rate-Limit-Reset': '1640995200',
  
  // API Information
  'X-API-Version': 'v2.0.0',
  'X-API-Endpoint': '/api/v1/auth/login',
  'X-API-Method': 'POST'
}`;
```

### Request Validation Headers

```typescript
const REQUEST_VALIDATION_HEADERS = {
  // Client Identification
  'X-Client-ID': 'fire22_dashboard_web',
  'X-Client-Version': '3.0.9',
  'X-Client-Platform': 'web',

  // Request Context
  'X-Requested-With': 'XMLHttpRequest',
  'X-Request-Source': 'dashboard',
  'X-Request-Priority': 'normal|high|critical',

  // Security Validation
  'X-CSRF-Token': 'csrf_token_uuid',
  'X-Anti-Forgery-Token': 'anti_forgery_uuid',
  'X-Device-Fingerprint': 'device_hash',

  // User Context
  'X-User-Agent': 'Fire22-Dashboard/3.0.9 (Enhanced Security)',
  'X-User-Locale': 'en-US',
  'X-User-TimeZone': 'America/New_York',
};
```

## 🌐 HTML Meta Headers

### Security Meta Tags

```html
<!-- Security Meta Tags -->
`&lt;meta http-equiv="Content-Security-Policy" content="default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self'
'unsafe-inline' https://fonts.googleapis.com; font-src 'self'
https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'
https://api.fire22.com; frame-ancestors 'none';"&gt;`
<meta http-equiv="X-Content-Type-Options" content="nosniff" />
<meta http-equiv="X-Frame-Options" content="DENY" />
`&lt;meta http-equiv="X-XSS-Protection" content="1; mode=block"&gt;`
<meta http-equiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
<meta
  http-equiv="Permissions-Policy"
  content="geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
/>

`&lt;!-- Fire22 Security Meta Tags --&gt;` `&lt;meta
name="fire22:security-level" content="enhanced"&gt;` `&lt;meta
name="fire22:auth-required" content="true"&gt;` `&lt;meta
name="fire22:csrf-protection" content="enabled"&gt;` `&lt;meta
name="fire22:rate-limiting" content="enabled"&gt;` `&lt;meta
name="fire22:audit-logging" content="enabled"&gt;`
```

### Performance Meta Tags

```html
<!-- Performance Meta Tags -->
<meta
  http-equiv="Cache-Control"
  content="no-cache, no-store, must-revalidate"
/>
<meta http-equiv="Pragma" content="no-cache" />
`&lt;meta http-equiv="Expires" content="0"&gt;` `&lt;meta name="viewport"
content="width=device-width, initial-scale=1.0, maximum-scale=1.0,
user-scalable=no"&gt;`
<meta name="format-detection" content="telephone=no" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta
  name="apple-mobile-web-app-status-bar-style"
  content="black-translucent"
/>
```

### SEO & Accessibility Meta Tags

```html
<!-- SEO & Accessibility Meta Tags -->
`&lt;meta charset="UTF-8"&gt;` `&lt;meta name="description" content="Fire22
Dashboard - Advanced Sports Betting Management System with Enhanced
Security"&gt;`
<meta
  name="keywords"
  content="sports betting, dashboard, management, security, JWT, authentication"
/>
`&lt;meta name="author" content="Fire22 Team"&gt;`
<meta name="robots" content="index, follow" />
<meta name="language" content="English" />
`&lt;meta name="revisit-after" content="7 days"&gt;`
<meta name="distribution" content="global" />
<meta name="rating" content="general" />
`&lt;meta name="theme-color" content="#1a2a6c"&gt;` `&lt;meta
name="msapplication-TileColor" content="#1a2a6c"&gt;` `&lt;meta
name="apple-mobile-web-app-title" content="Fire22 Dashboard"&gt;`
```

## ⚙️ Implementation Standards

### Header Application Function

```typescript
class HeaderManager {
  private static instance: HeaderManager;
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  static getInstance(): HeaderManager {
    if (!HeaderManager.instance) {
      HeaderManager.instance = new HeaderManager();
    }
    return HeaderManager.instance;
  }

  // Apply security headers to response
  applySecurityHeaders(response: Response): Response {
    const headers = new Headers(response.headers);
    const securityHeaders = this.getSecurityHeaders();

    Object.entries(securityHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Get environment-specific security headers
  private getSecurityHeaders(): Record<string, string> {
    return this.environment === 'production'
      ? PRODUCTION_SECURITY_HEADERS
      : DEVELOPMENT_SECURITY_HEADERS;
  }

  // Apply CORS headers
  applyCorsHeaders(response: Response, origin?: string): Response {
    const headers = new Headers(response.headers);
    const corsHeaders = this.getCorsHeaders(origin);

    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Get CORS headers based on origin
  private getCorsHeaders(origin?: string): Record<string, string> {
    if (this.environment === 'production') {
      return {
        ...CORS_HEADERS,
        'Access-Control-Allow-Origin': origin || 'https://dashboard.fire22.com',
      };
    }
    return CORS_HEADERS;
  }

  // Apply Fire22 system headers
  applySystemHeaders(response: Response, request: Request): Response {
    const headers = new Headers(response.headers);
    const systemHeaders = this.generateSystemHeaders(request);

    Object.entries(systemHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  // Generate system headers for request
  private generateSystemHeaders(request: Request): Record<string, string> {
    const requestId = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);

    return {
      'X-Fire22-Version': '3.0.9',
      'X-Fire22-Build': '2024.08.27.001',
      'X-Fire22-Environment': this.environment,
      'X-Fire22-Security': 'enhanced',
      'X-Request-ID': `req_${timestamp}_${requestId}`,
      'X-Correlation-ID': requestId,
      'X-Trace-ID': requestId,
      'X-API-Version': 'v2.0.0',
      'X-API-Endpoint': new URL(request.url).pathname,
      'X-API-Method': request.method,
    };
  }
}
```

### Middleware Integration

```typescript
// Security headers middleware
app.use('*', async (c, next) => {
  await next();

  const headerManager = HeaderManager.getInstance();
  let response = c.res;

  // Apply security headers
  response = headerManager.applySecurityHeaders(response);

  // Apply CORS headers
  const origin = c.req.header('Origin');
  response = headerManager.applyCorsHeaders(response, origin);

  // Apply system headers
  response = headerManager.applySystemHeaders(response, c.req.raw);

  c.res = response;
});

// JWT validation middleware with enhanced headers
app.use('/api/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Authorization header required' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const decoded = await validateJWT(token);
    c.set('jwt-user', decoded);

    // Add JWT context headers
    c.header('X-JWT-Issuer', decoded.iss);
    c.header('X-JWT-Audience', decoded.aud);
    c.header('X-JWT-Expires', decoded.exp.toString());
    c.header('X-JWT-Subject', decoded.sub);

    await next();
  } catch (error) {
    return c.json({ error: 'Invalid JWT token' }, 401);
  }
});
```

## 🔒 Security Compliance

### OWASP Security Headers Checklist

- [x] **Strict-Transport-Security**: Enforce HTTPS
- [x] **Content-Security-Policy**: Prevent XSS and injection attacks
- [x] **X-Content-Type-Options**: Prevent MIME type sniffing
- [x] **X-Frame-Options**: Prevent clickjacking
- [x] **X-XSS-Protection**: Additional XSS protection
- [x] **Referrer-Policy**: Control referrer information
- [x] **Permissions-Policy**: Control browser features
- [x] **Cache-Control**: Prevent sensitive data caching

### NIST Cybersecurity Framework

- [x] **Identify**: Comprehensive header inventory
- [x] **Protect**: Security headers implementation
- [x] **Detect**: Header monitoring and logging
- [x] **Respond**: Security incident response headers
- [x] **Recover**: Recovery and backup headers

### GDPR Compliance Headers

- [x] **Privacy Headers**: User consent tracking
- [x] **Data Protection**: Secure data transmission
- [x] **Audit Trail**: Complete request logging
- [x] **User Rights**: Data access and deletion

## 🧪 Testing & Validation

### Header Validation Tests

```typescript
describe('Security Headers Validation', () => {
  test('should include all mandatory security headers', async () => {
    const response = await app.request('/api/health');

    expect(response.headers.get('Strict-Transport-Security')).toBeTruthy();
    expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
  });

  test('should include Fire22 system headers', async () => {
    const response = await app.request('/api/health');

    expect(response.headers.get('X-Fire22-Version')).toBe('3.0.9');
    expect(response.headers.get('X-Fire22-Security')).toBe('enhanced');
    expect(response.headers.get('X-Request-ID')).toMatch(
      /^req_\d+_[a-f0-9-]+$/
    );
  });

  test('should validate JWT headers', async () => {
    const token = await generateTestJWT();
    const response = await app.request('/api/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.headers.get('X-JWT-Issuer')).toBe('fire22.com');
    expect(response.headers.get('X-JWT-Audience')).toBe('dashboard');
    expect(response.headers.get('X-JWT-Subject')).toBeTruthy();
  });
});
```

### Security Header Scanner

```typescript
class SecurityHeaderScanner {
  static async scanEndpoint(url: string): Promise<SecurityHeaderReport> {
    const response = await fetch(url);
    const headers = response.headers;

    const report: SecurityHeaderReport = {
      url,
      timestamp: new Date().toISOString(),
      headers: {},
      securityScore: 0,
      recommendations: [],
    };

    // Check mandatory security headers
    const mandatoryHeaders = [
      'Strict-Transport-Security',
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
    ];

    let score = 0;
    mandatoryHeaders.forEach(header => {
      const value = headers.get(header);
      report.headers[header] = value;

      if (value) {
        score += 20; // 20 points per header
      } else {
        report.recommendations.push(`Missing ${header} header`);
      }
    });

    report.securityScore = Math.min(score, 100);

    // Check for additional security headers
    const additionalHeaders = [
      'Referrer-Policy',
      'Permissions-Policy',
      'X-Permitted-Cross-Domain-Policies',
    ];

    additionalHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        report.headers[header] = value;
        report.securityScore = Math.min(report.securityScore + 10, 100);
      }
    });

    return report;
  }
}

interface SecurityHeaderReport {
  url: string;
  timestamp: string;
  headers: Record<string, string>;
  securityScore: number;
  recommendations: string[];
}
```

## 📚 Additional Resources

### Header Standards References

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Security Headers Scanner](https://securityheaders.com/)
- [HTTP Security Headers](https://httpsecurityheaders.com/)

### Implementation Examples

- [Fire22 Dashboard Implementation](./dashboard-headers.md)
- [API Security Headers](./api-security-headers.md)
- [HTML Meta Headers](./html-meta-headers.md)
- [JWT Header Standards](./jwt-header-standards.md)

### Monitoring & Maintenance

- [Header Monitoring Dashboard](./header-monitoring.md)
- [Security Header Audits](./security-audits.md)
- [Header Performance Metrics](./header-metrics.md)
- [Compliance Reporting](./compliance-reports.md)

---

**Last Updated**: 2024-08-27  
**Version**: 1.0.0  
**Maintainer**: Fire22 Security Team  
**Review Cycle**: Quarterly
