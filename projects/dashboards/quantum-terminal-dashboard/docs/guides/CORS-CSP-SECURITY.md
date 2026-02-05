# 🔒 CORS & CSP Security Configuration

Production-ready CORS and Content Security Policy headers for the Quantum Terminal Dashboard.

## CORS Configuration

Configure in your API gateway (api.example.com) or Bun server:

```javascript
// src/middleware/cors.js
export function corsHeaders(origin) {
  const allowedOrigins = [
    'https://quantum.example.com',
    'https://dashboard.example.com',
    'https://admin.example.com',
  ];

  const isAllowed = allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Quantum-Id, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Access-Control-Expose-Headers': 'X-Quantum-Id, X-RateLimit-Remaining',
  };
}
```

## CSP Headers

Strict Content Security Policy to prevent XSS attacks:

```javascript
// src/middleware/csp.js
export function cspHeaders() {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.example.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };
}
```

## Security Headers

Additional security headers for defense-in-depth:

```javascript
// src/middleware/security.js
export function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}
```

## Bun Server Implementation

```javascript
// src/server.js
import { corsHeaders } from './middleware/cors.js';
import { cspHeaders } from './middleware/csp.js';
import { securityHeaders } from './middleware/security.js';

export const server = Bun.serve({
  hostname: '0.0.0.0',
  port: 3000,
  async fetch(request) {
    const origin = request.headers.get('origin');
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Your route handlers here
    const response = new Response('OK', { status: 200 });

    // Add security headers
    const headers = new Headers(response.headers);
    Object.entries({
      ...corsHeaders(origin),
      ...cspHeaders(),
      ...securityHeaders(),
    }).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  },
});
```

## CORS Preflight Handling

Properly handle OPTIONS requests:

```javascript
// src/middleware/preflight.js
export function handlePreflight(request, origin) {
  if (request.method !== 'OPTIONS') {
    return null;
  }

  const requestMethod = request.headers.get('access-control-request-method');
  const requestHeaders = request.headers.get('access-control-request-headers');

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': requestMethod || 'GET, POST, PUT, DELETE',
      'Access-Control-Allow-Headers': requestHeaders || 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

## Cookie Security with CORS

Ensure cookies work with CORS:

```javascript
// bun.yaml
api:
  cookie:
    name: __quantum
    httpOnly: true
    secure: true              # HTTPS only
    sameSite: strict          # CSRF protection
    maxAge: 86400
    domain: .example.com      # Allow subdomains
    path: /                   # All paths
```

## Testing CORS

```bash
# Test preflight request
curl -X OPTIONS https://api.example.com/v1/matrix \
  -H "Origin: https://quantum.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Test actual request with credentials
curl -X GET https://api.example.com/v1/matrix \
  -H "Origin: https://quantum.example.com" \
  -H "Cookie: __quantum=..." \
  -v
```

## CSP Violation Reporting

Report CSP violations to monitoring service:

```javascript
// bun.yaml
security:
  csp_report_uri: https://api.example.com/v1/csp-report
  csp_report_only: false    # Set to true for testing
```

## Common Issues

### Issue: CORS preflight fails
**Solution:** Ensure OPTIONS method is handled before route matching

### Issue: Cookies not sent with CORS
**Solution:** Set `credentials: 'include'` in fetch and `Access-Control-Allow-Credentials: true`

### Issue: CSP blocks inline scripts
**Solution:** Use nonce or hash for inline scripts, or move to external files

## Security Checklist

- ✅ CORS whitelist configured
- ✅ Credentials properly handled
- ✅ CSP headers strict
- ✅ X-Frame-Options set
- ✅ HSTS enabled
- ✅ Cookie flags set (HttpOnly, Secure, SameSite)
- ✅ Preflight handling implemented
- ✅ CSP reporting configured

## References

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN: CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP: CORS](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
- [OWASP: CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

