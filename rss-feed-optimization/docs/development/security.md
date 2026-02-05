# Security Guide

This guide provides comprehensive information about security best practices and implementations in the RSS Feed Optimization project.

## Overview

Security is a critical aspect of the RSS Feed Optimization project. This guide covers authentication, authorization, input validation, security headers, and other security measures implemented to protect the application and its users.

## Security Principles

### 1. Defense in Depth

The application implements multiple layers of security:

- **Network Security**: HTTPS, CORS, rate limiting
- **Application Security**: Input validation, authentication, authorization
- **Data Security**: Encryption, secure storage, access controls
- **Infrastructure Security**: Environment variables, secrets management

### 2. Least Privilege

- Admin operations require authentication tokens
- Read-only operations don't require authentication
- Minimal permissions for external service access

### 3. Secure by Default

- Security features enabled by default
- Strong default configurations
- Secure error handling

## Authentication and Authorization

### Admin Token Authentication

#### Implementation

```javascript
// src/middleware/auth.js
export function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Missing or invalid authorization header',
        statusCode: 401
      }
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({
      error: {
        message: 'Invalid admin token',
        statusCode: 401
      }
    });
  }

  next();
}
```

#### Usage

```javascript
// Protect admin endpoints
app.post('/api/v1/admin/sync', authenticateAdmin, async (req, res) => {
  // Admin operation
});
```

### Token Security

#### Token Generation

```javascript
// Generate secure admin token
function generateSecureToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// In .env file
ADMIN_TOKEN=$(openssl rand -base64 32)
```

#### Token Storage

```javascript
// .env.example
ADMIN_TOKEN=your-super-secret-admin-token

// Never commit .env files
echo ".env*" >> .gitignore
```

## Input Validation and Sanitization

### Request Validation

#### Post Validation

```javascript
// src/middleware/validation.js
export function validatePost(req, res, next) {
  const { title, slug, content, author, tags } = req.body;

  const errors = [];

  // Title validation
  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    errors.push('Title must be at least 3 characters long');
  }

  // Slug validation
  if (!slug || typeof slug !== 'string' || !/^[a-z0-9-]+$/.test(slug)) {
    errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
  }

  // Content validation
  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    errors.push('Content must be at least 10 characters long');
  }

  // Author validation
  if (!author || typeof author !== 'string' || author.trim().length < 2) {
    errors.push('Author name must be at least 2 characters long');
  }

  // Tags validation
  if (tags && !Array.isArray(tags)) {
    errors.push('Tags must be an array');
  } else if (tags && tags.some(tag => typeof tag !== 'string')) {
    errors.push('All tags must be strings');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: errors
      }
    });
  }

  next();
}
```

### XSS Protection

#### HTML Escaping

```javascript
// src/utils/security.js
export function sanitizeHTML(input) {
  // Use Bun's native escapeHTML for XSS protection
  return Bun.escapeHTML(input);
}

export function sanitizePost(post) {
  return {
    ...post,
    title: sanitizeHTML(post.title),
    content: sanitizeHTML(post.content),
    excerpt: sanitizeHTML(post.excerpt),
    author: sanitizeHTML(post.author)
  };
}
```

#### Content Security Policy

```javascript
// src/middleware/security.js
export function securityHeaders(req, res, next) {
  // Content Security Policy
  const cspDirectives = process.env.CSP_DIRECTIVES || 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
  
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS (HTTP Strict Transport Security)
  if (process.env.ENABLE_HSTS === 'true') {
    const maxAge = process.env.HSTS_MAX_AGE || 31536000;
    res.setHeader('Strict-Transport-Security', `max-age=${maxAge}; includeSubDomains`);
  }

  next();
}
```

## Rate Limiting

### Implementation

```javascript
// src/middleware/rate-limit.js
export class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 600000; // 10 minutes
    this.maxRequests = options.maxRequests || 200;
    this.blockDuration = options.blockDuration || 900000; // 15 minutes
    this.requests = new Map();
  }

  isLimited(ip) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(ip)) {
      this.requests.set(ip, []);
    }

    const userRequests = this.requests.get(ip);
    
    // Remove old requests
    const recentRequests = userRequests.filter(time => time > windowStart);
    this.requests.set(ip, recentRequests);

    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return true;
    }

    // Add current request
    recentRequests.push(now);
    return false;
  }

  getResetTime(ip) {
    const userRequests = this.requests.get(ip) || [];
    if (userRequests.length === 0) return 0;
    
    const oldestRequest = userRequests[0];
    const timeUntilReset = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, timeUntilReset);
  }
}

const limiter = new RateLimiter();

export function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  
  if (limiter.isLimited(ip)) {
    return res.status(429).json({
      error: {
        message: 'Too many requests',
        statusCode: 429,
        retryAfter: Math.ceil(limiter.getResetTime(ip) / 1000)
      }
    });
  }

  next();
}
```

### Rate Limiting Configuration

```javascript
// Different limits for different endpoints
app.use('/api/v1/admin', rateLimit);
app.use('/api/v1/posts', rateLimit);

// Custom rate limiter for RSS feeds
const rssLimiter = new RateLimiter({
  windowMs: 300000, // 5 minutes
  maxRequests: 50
});

app.use('/api/v1/rss', (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  
  if (rssLimiter.isLimited(ip)) {
    return res.status(429).json({
      error: {
        message: 'RSS feed access rate limit exceeded',
        statusCode: 429
      }
    });
  }
  
  next();
});
```

## CORS Configuration

### CORS Middleware

```javascript
// src/middleware/cors.js
export function cors(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['*'];

  // Check if origin is allowed
  const isAllowed = allowedOrigins.includes('*') || 
                   allowedOrigins.includes(origin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
}
```

### CORS Configuration

```bash
# .env file
CORS_ORIGIN=https://your-blog.com,https://admin.your-blog.com
CORS_CREDENTIALS=true
```

## Error Handling

### Secure Error Responses

```javascript
// src/middleware/error-handler.js
export function errorHandler(error, req, res, next) {
  // Log error details (but not to client)
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't expose internal errors to client
  if (error.statusCode >= 500) {
    return res.status(500).json({
      error: {
        message: 'Internal server error',
        statusCode: 500
      }
    });
  }

  // Return client errors as-is
  res.status(error.statusCode || 500).json({
    error: {
      message: error.message || 'An error occurred',
      statusCode: error.statusCode || 500
    }
  });
}
```

### Custom Error Classes

```javascript
// src/utils/errors.js
export class BlogError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'BlogError';
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends BlogError {
  constructor(resource) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends BlogError {
  constructor(message, field = null) {
    super(message, 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class UnauthorizedError extends BlogError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends BlogError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}
```

## Data Security

### Environment Variables Security

#### Secure Environment Configuration

```bash
# .env.production
NODE_ENV=production
BLOG_TITLE="Secure Blog"
BLOG_URL=https://secure-blog.com
ADMIN_TOKEN=$(openssl rand -base64 32)

# R2 Storage
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY=$(openssl rand -base64 32)
R2_BUCKET_NAME="production-bucket"

# Security settings
ENABLE_CSP=true
ENABLE_HSTS=true
ENABLE_RATE_LIMITING=true
CORS_ORIGIN="https://secure-blog.com"
LOG_LEVEL=warn
```

#### Environment Variable Validation

```javascript
// src/config/validator.js
export function validateEnvironment() {
  const required = [
    'BLOG_TITLE',
    'BLOG_URL',
    'ADMIN_TOKEN'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate admin token strength
  if (process.env.ADMIN_TOKEN.length < 32) {
    console.warn('WARNING: Admin token should be at least 32 characters long');
  }

  // Validate URLs
  try {
    new URL(process.env.BLOG_URL);
  } catch (error) {
    throw new Error('Invalid BLOG_URL format');
  }
}
```

### R2 Storage Security

#### Secure R2 Configuration

```javascript
// src/r2-client.js
export class R2BlogStorage {
  constructor() {
    // Validate R2 credentials
    if (!process.env.R2_ACCOUNT_ID || 
        !process.env.R2_ACCESS_KEY_ID || 
        !process.env.R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 credentials not configured');
    }

    this.client = s3({
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      region: 'auto'
    });

    this.bucketName = process.env.R2_BUCKET_NAME;
  }

  async uploadPost(post) {
    // Validate post data
    if (!post || !post.id || !post.slug) {
      throw new ValidationError('Invalid post data');
    }

    // Sanitize post content
    const sanitizedPost = {
      ...post,
      title: sanitizeHTML(post.title),
      content: sanitizeHTML(post.content),
      excerpt: sanitizeHTML(post.excerpt)
    };

    const key = `posts/${sanitizedPost.slug}.json`;
    
    await this.client.putObject({
      Bucket: this.bucketName,
      Key: key,
      Body: JSON.stringify(sanitizedPost),
      ContentType: 'application/json'
    });

    return key;
  }
}
```

## Security Headers

### Comprehensive Security Headers

```javascript
// src/middleware/security.js
export function securityHeaders(req, res, next) {
  // Content Security Policy
  const cspDirectives = process.env.CSP_DIRECTIVES || 
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-ancestors 'none';";
  
  res.setHeader('Content-Security-Policy', cspDirectives);
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS
  if (process.env.ENABLE_HSTS === 'true') {
    const maxAge = process.env.HSTS_MAX_AGE || 31536000;
    res.setHeader('Strict-Transport-Security', `max-age=${maxAge}; includeSubDomains; preload`);
  }

  // Cache control for sensitive endpoints
  if (req.path.startsWith('/api/v1/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}
```

## Input Sanitization

### Comprehensive Input Sanitization

```javascript
// src/utils/sanitizer.js
export class InputSanitizer {
  static sanitizeString(input, maxLength = 10000) {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }

    const trimmed = input.trim();
    
    if (trimmed.length > maxLength) {
      throw new ValidationError(`Input too long (max ${maxLength} characters)`);
    }

    return Bun.escapeHTML(trimmed);
  }

  static sanitizeSlug(input) {
    const sanitized = this.sanitizeString(input, 100);
    
    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(sanitized)) {
      throw new ValidationError('Slug can only contain lowercase letters, numbers, and hyphens');
    }

    return sanitized;
  }

  static sanitizeTags(tags) {
    if (!Array.isArray(tags)) {
      throw new ValidationError('Tags must be an array');
    }

    return tags.map(tag => {
      const sanitized = this.sanitizeString(tag, 50);
      if (sanitized.length === 0) {
        throw new ValidationError('Tag cannot be empty');
      }
      return sanitized;
    });
  }

  static sanitizePost(post) {
    return {
      id: this.sanitizeString(post.id, 50),
      title: this.sanitizeString(post.title, 200),
      slug: this.sanitizeSlug(post.slug),
      content: this.sanitizeString(post.content, 50000),
      excerpt: this.sanitizeString(post.excerpt || '', 500),
      author: this.sanitizeString(post.author, 100),
      tags: this.sanitizeTags(post.tags || []),
      publishedAt: new Date(post.publishedAt).toISOString(),
      updatedAt: new Date(post.updatedAt || Date.now()).toISOString(),
      readTime: Math.max(1, Math.min(120, parseInt(post.readTime) || 5)),
      wordCount: Math.max(1, parseInt(post.wordCount) || 100)
    };
  }
}
```

## Security Testing

### Security Test Suite

```javascript
// tests/security/auth.test.js
import { test, expect } from 'bun:test';
import { serve } from 'bun';

test.describe('Authentication Security', () => {
  test('rejects requests without auth header', async () => {
    const response = await fetch('http://localhost:3000/api/v1/admin/sync');
    expect(response.status).toBe(401);
  });

  test('rejects requests with invalid token', async () => {
    const response = await fetch('http://localhost:3000/api/v1/admin/sync', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    expect(response.status).toBe(401);
  });

  test('accepts requests with valid token', async () => {
    const response = await fetch('http://localhost:3000/api/v1/admin/sync', {
      headers: {
        'Authorization': 'Bearer valid-admin-token'
      }
    });
    expect(response.status).toBe(200);
  });
});

test.describe('Input Validation Security', () => {
  test('rejects XSS attempts in post content', async () => {
    const maliciousContent = '<script>alert("xss")</script>';
    
    const response = await fetch('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-admin-token'
      },
      body: JSON.stringify({
        title: 'Test Post',
        slug: 'test-post',
        content: maliciousContent,
        author: 'Test Author'
      })
    });

    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.data.content).not.toContain('<script>');
    expect(data.data.content).toContain('<script>');
  });

  test('rejects oversized input', async () => {
    const largeContent = 'A'.repeat(100000); // 100KB content
    
    const response = await fetch('http://localhost:3000/api/v1/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-admin-token'
      },
      body: JSON.stringify({
        title: 'Test Post',
        slug: 'test-post',
        content: largeContent,
        author: 'Test Author'
      })
    });

    expect(response.status).toBe(400);
  });
});

test.describe('Rate Limiting Security', () => {
  test('enforces rate limits', async () => {
    const requests = Array.from({ length: 250 }, () =>
      fetch('http://localhost:3000/api/v1/posts')
    );

    const responses = await Promise.all(requests);
    const rateLimitedResponses = responses.filter(r => r.status === 429);

    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

## Security Monitoring

### Security Event Logging

```javascript
// src/utils/security-logger.js
export class SecurityLogger {
  static logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event,
      details: details,
      ip: details.ip,
      userAgent: details.userAgent,
      url: details.url,
      method: details.method
    };

    // Log to console
    console.warn('[SECURITY]', JSON.stringify(logEntry));

    // Log to file (if configured)
    if (process.env.SECURITY_LOG_FILE) {
      const fs = require('fs');
      fs.appendFileSync(
        process.env.SECURITY_LOG_FILE,
        JSON.stringify(logEntry) + '\n'
      );
    }

    // Send to security monitoring service (if configured)
    if (process.env.SECURITY_WEBHOOK_URL) {
      fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry)
      }).catch(console.error);
    }
  }

  static logFailedAuth(ip, userAgent) {
    this.logSecurityEvent('failed_auth', { ip, userAgent });
  }

  static logRateLimitExceeded(ip, userAgent, url) {
    this.logSecurityEvent('rate_limit_exceeded', { ip, userAgent, url });
  }

  static logXSSAttempt(ip, userAgent, payload) {
    this.logSecurityEvent('xss_attempt', { ip, userAgent, payload });
  }
}
```

### Security Middleware Integration

```javascript
// src/middleware/security-monitoring.js
export function securityMonitoring(req, res, next) {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Log security events
    if (res.statusCode === 401) {
      SecurityLogger.logFailedAuth(req.ip, req.get('User-Agent'));
    }
    
    if (res.statusCode === 429) {
      SecurityLogger.logRateLimitExceeded(req.ip, req.get('User-Agent'), req.url);
    }

    return originalSend.call(this, body);
  };

  next();
}
```

## Security Best Practices

### 1. Secure Development Practices

```javascript
// src/utils/development.js
export function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function secureDevelopmentHeaders(req, res, next) {
  if (isDevelopment()) {
    // In development, allow more permissive CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  if (isProduction()) {
    // In production, enforce strict security
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }

  next();
}
```

### 2. Dependency Security

```json
// package.json
{
  "scripts": {
    "audit": "bun audit",
    "audit:fix": "bun audit --fix"
  }
}
```

### 3. Environment Security

```bash
# Secure environment setup
chmod 600 .env
chown root:root .env
```

### 4. Regular Security Audits

```javascript
// scripts/security-audit.js
import { execSync } from 'child_process';

export async function runSecurityAudit() {
  console.log('Running security audit...');
  
  try {
    // Check for known vulnerabilities
    execSync('bun audit', { stdio: 'inherit' });
    
    // Check for outdated packages
    execSync('bun outdated', { stdio: 'inherit' });
    
    // Validate environment variables
    const { validateEnvironment } = await import('../src/config/validator.js');
    validateEnvironment();
    
    console.log('Security audit completed successfully');
  } catch (error) {
    console.error('Security audit failed:', error.message);
    process.exit(1);
  }
}
```

## Incident Response

### Security Incident Handling

```javascript
// src/utils/incident-response.js
export class IncidentResponse {
  static async handleSecurityIncident(incident) {
    console.error('[SECURITY INCIDENT]', incident);
    
    // Log incident details
    const incidentLog = {
      timestamp: new Date().toISOString(),
      type: incident.type,
      severity: incident.severity,
      details: incident.details,
      affected: incident.affected
    };

    // Send alerts
    await this.sendSecurityAlert(incidentLog);
    
    // Take automated actions based on severity
    switch (incident.severity) {
      case 'critical':
        await this.handleCriticalIncident(incidentLog);
        break;
      case 'high':
        await this.handleHighIncident(incidentLog);
        break;
      case 'medium':
        await this.handleMediumIncident(incidentLog);
        break;
      default:
        console.log('Incident logged for review');
    }
  }

  static async sendSecurityAlert(incident) {
    // Send to security team
    if (process.env.SECURITY_EMAIL) {
      // Implementation for sending email alerts
    }
    
    // Send to monitoring service
    if (process.env.SECURITY_WEBHOOK_URL) {
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incident)
      });
    }
  }

  static async handleCriticalIncident(incident) {
    // Critical incidents: immediate response
    console.error('CRITICAL SECURITY INCIDENT - IMMEDIATE ACTION REQUIRED');
    
    // Log to security incident file
    const fs = require('fs');
    fs.appendFileSync('security-incidents.log', JSON.stringify(incident) + '\n');
    
    // Trigger automated response if configured
    if (process.env.AUTO_INCIDENT_RESPONSE === 'true') {
      await this.triggerIncidentResponse(incident);
    }
  }

  static async triggerIncidentResponse(incident) {
    // Implementation for automated incident response
    // This could include:
    // - Blocking IPs
    // - Disabling admin access
    // - Notifying security team
    // - Taking system offline
  }
}
```

This comprehensive security guide ensures the RSS Feed Optimization project maintains robust security practices and protects against common web application vulnerabilities.