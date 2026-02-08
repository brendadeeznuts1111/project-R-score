# Cookie Security v3.26 Integration Guide

> Step-by-step guide for integrating Tier-1380 cookie security into your Bun application

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Server Integration](#server-integration)
3. [Client-Side Integration](#client-side-integration)
4. [Security Best Practices](#security-best-practices)
5. [Troubleshooting](#troubleshooting)

## Basic Setup

### 1. Import the Module

```typescript
import { 
  cookieSecurity, 
  variantManager,
  Tier1380CookieSecurity 
} from '../lib/cookie-security-v3.26';
```

### 2. Environment Configuration

Create `.env` file:

```env
# Required for CSRF token signing
CSRF_SECRET=your-256-bit-secret-here-change-in-production

# Required for A/B testing variant signing
VARIANT_SECRET=your-variant-secret-here-change-in-production

# Optional: Enable debug logging
DEBUG_COOKIE_SECURITY=false
```

### 3. Start CSRF Cleanup

```typescript
// In your server startup
import { cookieSecurity } from '../lib/cookie-security-v3.26';

// Clean up expired CSRF tokens every hour
cookieSecurity.startCleanup();

console.log('🍪 Cookie Security v3.26 initialized');
```

## Server Integration

### Bun.serve Complete Example

```typescript
import { serve, Cookie } from 'bun';
import { cookieSecurity, variantManager } from '../lib/cookie-security-v3.26';

// Start cleanup
cookieSecurity.startCleanup();

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    
    // ========================================
    // 1. PARSE AND VALIDATE ALL COOKIES
    // ========================================
    const cookieHeader = req.headers.get('cookie') || '';
    const cookieStrings = cookieHeader.split(';').map(c => c.trim()).filter(Boolean);
    
    const auditResults = cookieStrings.map(str => {
      const { cookie, report } = cookieSecurity.parseAndValidate(str);
      return { name: cookie?.name || 'unknown', report };
    });
    
    // Check for security failures
    const insecure = auditResults.filter(r => !r.report.valid);
    if (insecure.length > 0 && url.pathname.startsWith('/api')) {
      return Response.json({
        error: 'Insecure cookies detected',
        cookies: insecure.map(i => ({ name: i.name, issues: i.report.issues }))
      }, { status: 400 });
    }
    
    // ========================================
    // 2. LOGIN - Create secure session
    // ========================================
    if (url.pathname === '/login' && req.method === 'POST') {
      const sessionId = crypto.randomUUID();
      
      // Create secure session cookie
      const { cookie: sessionCookie, report } = cookieSecurity.createSecure(
        '__Host-session',
        { id: sessionId, role: 'user', created: Date.now() },
        'session'
      );
      
      console.log('Session created with grade:', report.grade);
      
      // Create CSRF token
      const { token, cookie: csrfCookie } = await cookieSecurity.generateCSRF(sessionId);
      
      // Assign A/B variant for new users
      const variant = Math.random() > 0.5 ? 'A' : 'B';
      const { cookie: variantCookie } = variantManager.createVariantCookie(
        sessionId,
        variant,
        { maxAge: 60 * 60 * 24 * 30 } // 30 days
      );
      
      return Response.json({
        success: true,
        variant,
        csrfToken: token
      }, {
        headers: {
          'Set-Cookie': [
            sessionCookie.serialize(),
            csrfCookie.serialize(),
            variantCookie.serialize()
          ].join(', ')
        }
      });
    }
    
    // ========================================
    // 3. VALIDATE CSRF ON MUTATIONS
    // ========================================
    if (url.pathname === '/api/action' && req.method === 'POST') {
      // Get session and CSRF token
      const sessionCookie = cookieStrings.find(c => c.startsWith('__Host-session='));
      const sessionId = sessionCookie ? 
        JSON.parse(decodeURIComponent(sessionCookie.split('=')[1])).id : null;
      
      const submittedToken = req.headers.get('X-CSRF-Token');
      
      if (!cookieSecurity.validateCSRF(sessionId, submittedToken)) {
        return new Response('Invalid CSRF token', { status: 403 });
      }
      
      // Process action...
      return Response.json({ success: true });
    }
    
    // ========================================
    // 4. VALIDATE VARIANT FOR A/B TESTING
    // ========================================
    if (url.pathname === '/dashboard') {
      const variantCookie = cookieStrings.find(c => c.startsWith('ab_variant='));
      const sessionCookie = cookieStrings.find(c => c.startsWith('__Host-session='));
      
      if (variantCookie && sessionCookie) {
        const sessionId = JSON.parse(decodeURIComponent(
          sessionCookie.split('=')[1]
        )).id;
        
        const variantValue = variantCookie.split('=').slice(1).join('=');
        const result = variantManager.validateVariant(variantValue, sessionId);
        
        if (result.valid) {
          // Serve variant-specific content
          return new Response(renderDashboard(result.variant));
        }
      }
      
      return new Response(renderDashboard('control'));
    }
    
    // ========================================
    // 5. SECURITY REPORT ENDPOINT
    // ========================================
    if (url.pathname === '/security-report') {
      return Response.json({
        timestamp: new Date().toISOString(),
        cookies: auditResults.map(r => ({
          name: r.name,
          grade: r.report.grade,
          score: r.report.score,
          valid: r.report.valid,
          issues: r.report.issues,
          warnings: r.report.warnings
        })),
        overall: {
          grade: calculateOverallGrade(auditResults),
          secure: insecure.length === 0,
          csrfTokens: cookieSecurity.getCSRFStats()
        }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
});

function calculateOverallGrade(results: any[]) {
  if (results.length === 0) return 'N/A';
  const avgScore = results.reduce((a, r) => a + r.report.score, 0) / results.length;
  if (avgScore >= 95) return 'A+';
  if (avgScore >= 90) return 'A';
  if (avgScore >= 80) return 'B';
  if (avgScore >= 70) return 'C';
  if (avgScore >= 60) return 'D';
  return 'F';
}

function renderDashboard(variant: string) {
  return `<!DOCTYPE html>
<html>
<head><title>Dashboard ${variant}</title></head>
<body>
  <h1>Dashboard (Variant ${variant})</h1>
  <div id="cookie-security-badge">Checking...</div>
  <script>
    // Client-side security check
    (function() {
      const checks = {
        secure: location.protocol === 'https:',
        httpOnly: false, // Cannot detect from JS
        sameSite: false  // Cannot detect from JS
      };
      
      let score = checks.secure ? 30 : 0;
      let grade = score >= 30 ? 'C' : 'F';
      
      const badge = document.getElementById('cookie-security-badge');
      badge.textContent = '🍪 Grade: ' + grade;
      badge.style.color = grade === 'F' ? '#FF0044' : '#FFDD00';
    })();
  </script>
</body>
</html>`;
}
```

## Client-Side Integration

### JavaScript Security Checker

```javascript
/**
 * Client-side cookie security checker
 * Updates badge based on detectable security features
 */
class ClientCookieSecurity {
  constructor() {
    this.checks = {
      secure: location.protocol === 'https:',
      httpOnly: false, // Cannot be detected from JS
      sameSite: false  // Cannot be detected from JS
    };
  }

  calculateGrade() {
    let score = 0;
    if (this.checks.secure) score += 30;
    
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  getColor(grade) {
    const colors = {
      'A+': '#00FF00',
      'A': '#00FF88',
      'B': '#88FF00',
      'C': '#FFDD00',
      'D': '#FF8800',
      'F': '#FF0044'
    };
    return colors[grade] || '#00DDFF';
  }

  updateBadge(elementId = 'cookie-security-badge') {
    const badge = document.getElementById(elementId);
    if (!badge) return;

    const grade = this.calculateGrade();
    const color = this.getColor(grade);
    
    badge.innerHTML = `
      <span style="color: ${color}; font-weight: bold;">
        🔒 🍪 v3.26 ${grade}
      </span>
    `;
    
    badge.title = `Cookie Security v3.26\n` +
      `Grade: ${grade}\n` +
      `HTTPS: ${this.checks.secure ? '✓' : '✗'}\n` +
      `Note: HttpOnly and SameSite cannot be detected client-side`;
  }
}

// Usage
const checker = new ClientCookieSecurity();
checker.updateBadge();
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

interface CookieSecurityStatus {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | '?';
  secure: boolean;
  color: string;
}

export function useCookieSecurity(): CookieSecurityStatus {
  const [status, setStatus] = useState<CookieSecurityStatus>({
    grade: '?',
    secure: false,
    color: '#00DDFF'
  });

  useEffect(() => {
    const secure = window.location.protocol === 'https:';
    const grade = secure ? 'C' : 'F';
    
    const colors: Record<string, string> = {
      'A+': '#00FF00',
      'A': '#00FF88',
      'B': '#88FF00',
      'C': '#FFDD00',
      'D': '#FF8800',
      'F': '#FF0044',
      '?': '#00DDFF'
    };

    setStatus({
      grade,
      secure,
      color: colors[grade]
    });
  }, []);

  return status;
}

// Usage in component
function SecurityBadge() {
  const { grade, color } = useCookieSecurity();
  
  return (
    <span style={{ color, fontWeight: 'bold' }}>
      🔒 🍪 v3.26 {grade}
    </span>
  );
}
```

## Security Best Practices

### 1. Use __Host- Prefix for Session Cookies

```typescript
// Most secure option - forces Secure, Path=/, no Domain
const { cookie } = cookieSecurity.createSecure(
  '__Host-session',  // Prefix enforced by browser
  sessionData,
  'session'
);
```

### 2. Always Validate CSRF on State-Changing Operations

```typescript
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

if (PROTECTED_METHODS.includes(req.method)) {
  const isValid = cookieSecurity.validateCSRF(sessionId, csrfToken);
  if (!isValid) {
    return new Response('CSRF validation failed', { status: 403 });
  }
}
```

### 3. Rotate CSRF Tokens Periodically

```typescript
// Generate new token on sensitive actions
if (url.pathname === '/change-password') {
  // Validate old token first
  if (!cookieSecurity.validateCSRF(sessionId, oldToken)) {
    return new Response('Invalid token', { status: 403 });
  }
  
  // Generate new token after successful action
  const { token, cookie } = await cookieSecurity.generateCSRF(sessionId);
  
  return Response.json({ success: true }, {
    headers: {
      'X-CSRF-Token': token,
      'Set-Cookie': cookie.serialize()
    }
  });
}
```

### 4. Monitor CSRF Token Stats

```typescript
// Health check endpoint
if (url.pathname === '/health/csrf') {
  const stats = cookieSecurity.getCSRFStats();
  
  return Response.json({
    active: stats.active,
    expired: stats.expired,
    healthy: stats.expired < stats.active * 0.1 // Less than 10% expired
  });
}
```

## Troubleshooting

### Issue: CSRF validation always fails

**Cause:** Session ID mismatch between token generation and validation

**Solution:** Ensure you're using the same session identifier:

```typescript
// Store session ID consistently
const sessionId = crypto.randomUUID();

// Generate
const { token } = await cookieSecurity.generateCSRF(sessionId);

// Validate - use SAME sessionId
const isValid = cookieSecurity.validateCSRF(sessionId, submittedToken);
```

### Issue: Variant validation fails

**Cause:** User ID mismatch or expired cookie

**Solution:** Check user identification:

```typescript
const result = variantManager.validateVariant(cookieValue, userId);

if (!result.valid) {
  // Try to re-assign variant
  const { cookie } = variantManager.createVariantCookie(userId, 'A');
  // Set new cookie...
}
```

### Issue: "Cookie.parse is not a function"

**Cause:** Using older Bun version without Cookie API

**Solution:** Upgrade Bun:

```bash
bun upgrade

# Verify
bun --version  # Should be >= 1.1.0
```

### Issue: Debug logging not working

**Cause:** Environment variable not set

**Solution:**

```bash
# Before running
export DEBUG_COOKIE_SECURITY=true
bun run server.ts

# Or inline
DEBUG_COOKIE_SECURITY=true bun run server.ts
```

## Performance Tips

### 1. Reuse CookieSecurity Instance

```typescript
// ✅ Good - singleton
import { cookieSecurity } from '../lib/cookie-security-v3.26';

// ❌ Bad - creating new instance per request
const security = new Tier1380CookieSecurity();
```

### 2. Batch Cookie Validation

```typescript
// ✅ Good - validate all at once
const results = cookies.map(c => cookieSecurity.parseAndValidate(c));

// ❌ Bad - validating one by one in loop
for (const c of cookies) {
  const result = cookieSecurity.parseAndValidate(c); // Slower
}
```

### 3. Use Bun's Native CookieMap

```typescript
import { CookieMap } from 'bun';

// Efficient cookie access
const cookies = new CookieMap(request.headers);
const session = cookies.get('session');
```

---

**Need Help?** Check the [main documentation](../lib/README-cookie-security.md) or [Bun Cookie API docs](https://bun.sh/docs/api/cookies)
