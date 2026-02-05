# 🔐 Enhanced JWT Authentication System

## Overview

The Enhanced JWT Authentication System is a comprehensive, production-ready
authentication solution for Cloudflare Workers with advanced security features
including rate limiting, audit logging, session management, and robust
protection against common security threats.

## Features

### 🔐 Core Authentication

- **JWT Token Generation & Verification**: Secure HMAC-SHA256 based tokens
- **Password Hashing**: Bcrypt-compatible password hashing (simulated for demo)
- **User Management**: Role-based access control (admin, user)
- **Token Refresh**: Secure token renewal without re-authentication

### 🛡️ Security Features

- **Rate Limiting**: Configurable request rate limiting per IP address
- **Account Lockout**: Automatic account lockout after failed login attempts
- **Audit Logging**: Comprehensive logging of all authentication events
- **Session Management**: Device fingerprinting and session tracking
- **Token Revocation**: Admin-controlled token invalidation
- **Security Headers**: Complete security header implementation

### 📊 Monitoring & Management

- **Health Check**: System health monitoring with statistics
- **Admin Endpoints**: Secure admin-only management interfaces
- **Audit Trail**: Complete audit log access for administrators
- **Session Monitoring**: Real-time session tracking and management

## Quick Start

### 1. Setup Environment Variables

```bash
# Required for production
export JWT_SECRET="your-super-secret-jwt-key-change-in-production"
export AUTH_BASE_URL="https://your-domain.com"

# Optional configuration
export PERMISSIONS_TEST_TIMEOUT="10000"
export PERMISSIONS_TEST_RETRIES="3"
export PERMISSIONS_TEST_VERBOSE="true"
```

### 2. Deploy the Authentication Worker

```bash
# Using Wrangler
cd dashboard-worker/src
wrangler deploy

# Or using the enhanced deploy script
cd dashboard-worker/scripts
bun run enhanced-deploy.ts
```

### 3. Test the System

```bash
# Quick test
cd dashboard-worker/src
bun jwt-auth-test-client-enhanced.ts quick

# Comprehensive security test
bun jwt-auth-test-client-enhanced.ts comprehensive
```

## API Endpoints

### Authentication Endpoints

#### POST `/auth/login`

Authenticate user and receive JWT token.

**Request:**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**

```json
{
  "message": "Authentication successful",
  "user": {
    "id": "1",
    "username": "admin",
    "role": "admin",
    "created_at": "2025-01-01T00:00:00.000Z",
    "last_login": "2025-01-01T12:00:00.000Z",
    "mfa_enabled": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "session": {
    "id": "session-uuid",
    "expires_at": "2025-01-01T13:00:00.000Z",
    "device_fingerprint": "device-fingerprint-hash"
  }
}
```

#### POST `/auth/refresh`

Refresh an existing JWT token.

**Request:**

```json
{}
```

**Headers:**

```
Authorization: Bearer <existing-token>
```

#### POST `/auth/logout`

Invalidate current session and token.

**Request:**

```json
{}
```

**Headers:**

```
Authorization: Bearer <token-to-invalidate>
```

#### GET `/auth/me`

Get current user information.

**Headers:**

```
Authorization: Bearer <valid-token>
```

### Protected Endpoints

#### GET `/protected`

Access protected resource (requires valid JWT).

**Headers:**

```
Authorization: Bearer <valid-token>
```

**Response:**

```json
{
  "message": "Access granted to protected resource",
  "user": {
    "id": "1",
    "username": "admin",
    "role": "admin"
  },
  "data": {
    "secret": "This is protected data only accessible with valid JWT",
    "timestamp": "2025-01-01T12:00:00.000Z",
    "session_id": "session-uuid"
  }
}
```

### Admin Endpoints (Require Admin Role)

#### GET `/admin/audit-logs`

Retrieve audit logs.

**Query Parameters:**

- `limit` (optional): Number of logs to retrieve (default: 100)

**Headers:**

```
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "audit_logs": [
    {
      "id": "log-uuid",
      "timestamp": "2025-01-01T12:00:00.000Z",
      "user_id": "1",
      "username": "admin",
      "action": "LOGIN_SUCCESS",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "success": true
    }
  ],
  "total": 1
}
```

#### GET `/admin/sessions`

Retrieve active sessions.

**Headers:**

```
Authorization: Bearer <admin-token>
```

**Response:**

```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "user_id": "1",
      "jti": "jwt-uuid",
      "created_at": "2025-01-01T12:00:00.000Z",
      "expires_at": "2025-01-01T13:00:00.000Z",
      "last_accessed": "2025-01-01T12:30:00.000Z",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "is_active": true,
      "device_fingerprint": "device-fingerprint-hash"
    }
  ],
  "total": 1
}
```

#### POST `/admin/revoke-token`

Revoke a specific JWT token.

**Request:**

```json
{
  "token_to_revoke": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Headers:**

```
Authorization: Bearer <admin-token>
```

### System Endpoints

#### GET `/health`

System health check and statistics.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "version": "2.0.0",
  "uptime": 3600,
  "active_sessions": 5,
  "total_audit_logs": 150
}
```

## Configuration

### Authentication Configuration

```typescript
const config = {
  jwtSecret: 'your-secret-key-change-in-production',
  issuer: 'fire22-auth',
  audience: 'fire22-api',
  tokenExpiry: 3600, // 1 hour in seconds
  refreshTokenExpiry: 86400, // 24 hours in seconds
  maxLoginAttempts: 5, // Maximum failed login attempts
  lockoutDuration: 900, // 15 minutes in seconds
  rateLimitWindow: 60, // 1 minute in seconds
  rateLimitMax: 10, // 10 requests per window
  enableAuditLogging: true, // Enable audit logging
  enableMFA: false, // Enable multi-factor authentication
  bcryptRounds: 12, // Bcrypt hashing rounds
};
```

### Environment Variables

| Variable                   | Description               | Default                 | Required         |
| -------------------------- | ------------------------- | ----------------------- | ---------------- |
| `JWT_SECRET`               | JWT signing secret        | -                       | Yes (Production) |
| `AUTH_BASE_URL`            | Base URL for auth service | `http://localhost:8788` | No               |
| `PERMISSIONS_TEST_TIMEOUT` | Request timeout in ms     | `10000`                 | No               |
| `PERMISSIONS_TEST_RETRIES` | Number of retry attempts  | `3`                     | No               |
| `PERMISSIONS_TEST_VERBOSE` | Enable verbose logging    | `false`                 | No               |

## Default Users

The system comes with pre-configured users for testing:

| Username   | Password   | Role  | Description                      |
| ---------- | ---------- | ----- | -------------------------------- |
| `admin`    | `admin123` | admin | Administrator with full access   |
| `user`     | `user123`  | user  | Regular user with basic access   |
| `TITTYB69` | `test123`  | user  | Test user for specific scenarios |

**⚠️ Security Note:** Change these default passwords in production!

## Security Features

### Rate Limiting

- **Window**: 60 seconds
- **Max Requests**: 10 per IP address
- **Response**: HTTP 429 with error message
- **Reset**: Automatic reset after window expires

### Account Lockout

- **Max Attempts**: 5 failed login attempts
- **Lockout Duration**: 15 minutes
- **Behavior**: Account locked even with correct password
- **Reset**: Automatic after lockout duration

### Audit Logging

- **Events Tracked**: Login attempts, token operations, admin actions
- **Data Stored**: User info, IP addresses, timestamps, success/failure
- **Retention**: Last 1000 events (configurable)
- **Access**: Admin-only endpoint for retrieval

### Session Management

- **Device Fingerprinting**: Unique identifier per device/browser
- **Session Tracking**: Creation, expiration, last access times
- **Automatic Cleanup**: Expired sessions removed automatically
- **Admin Monitoring**: Real-time session visibility

### Token Security

- **Algorithm**: HMAC-SHA256
- **Payload**: Enhanced with session ID, device fingerprint, IP address
- **Expiration**: Configurable token lifetime
- **Revocation**: Admin-controlled token invalidation
- **Refresh**: Secure token renewal mechanism

## Testing

### Running Tests

```bash
# Quick security test (basic functionality)
bun jwt-auth-test-client-enhanced.ts quick

# Comprehensive security test (all features)
bun jwt-auth-test-client-enhanced.ts comprehensive

# Custom base URL
AUTH_BASE_URL=https://your-auth-service.com bun jwt-auth-test-client-enhanced.ts comprehensive
```

### Test Coverage

The comprehensive test suite validates:

- ✅ JWT Authentication with enhanced payload
- ✅ Password hashing and verification
- ✅ Rate limiting and brute force protection
- ✅ Account lockout after failed attempts
- ✅ Comprehensive audit logging
- ✅ Session management with device fingerprinting
- ✅ Token revocation and refresh
- ✅ Admin-only endpoints for management
- ✅ Security headers and CORS configuration
- ✅ Health monitoring and statistics

## Deployment

### Cloudflare Workers Deployment

1. **Configure Wrangler:**

   ```toml
   # wrangler.toml
   name = "enhanced-auth-worker"
   main = "jwt-auth-worker-enhanced.ts"
   compatibility_date = "2025-01-01"

   [env.production]
   vars = { JWT_SECRET = "your-production-secret" }
   ```

2. **Deploy:**

   ```bash
   wrangler deploy
   ```

3. **Verify Deployment:**
   ```bash
   curl https://your-worker.your-subdomain.workers.dev/health
   ```

### Local Development

```bash
# Start local development server
wrangler dev

# Test with local server
AUTH_BASE_URL=http://localhost:8788 bun jwt-auth-test-client-enhanced.ts quick
```

## Integration Guide

### Frontend Integration

```typescript
class AuthClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async login(username: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    this.token = data.token;
    localStorage.setItem('auth_token', data.token);
    return data;
  }

  async getProtectedData() {
    const response = await fetch(`${this.baseUrl}/protected`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Access denied');
    }

    return response.json();
  }
}
```

### Backend Service Integration

```typescript
// Middleware to verify JWT tokens
async function verifyToken(
  request: Request
): Promise<EnhancedJWTPayload | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  // Verify token with auth service
  const response = await fetch(
    'https://your-auth-worker.workers.dev/auth/verify',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

// Example protected route
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const payload = await verifyToken(request);

    if (!payload) {
      return new Response('Unauthorized', { status: 401 });
    }

    // User is authenticated, proceed with request
    return new Response(`Hello ${payload.username}!`);
  },
};
```

## Security Best Practices

### Production Deployment

1. **Environment Variables:**

   - Use strong, randomly generated JWT secrets
   - Store secrets in Cloudflare Workers secrets or environment variables
   - Never commit secrets to version control

2. **Network Security:**

   - Use HTTPS in production
   - Configure proper CORS policies
   - Implement additional WAF rules if needed

3. **Monitoring:**

   - Enable audit logging
   - Monitor failed login attempts
   - Set up alerts for suspicious activities

4. **User Management:**
   - Enforce strong password policies
   - Implement MFA for sensitive operations
   - Regular security audits

### Performance Considerations

1. **Token Expiration:**

   - Balance security and user experience
   - Short-lived access tokens (1-2 hours)
   - Longer-lived refresh tokens (24-48 hours)

2. **Rate Limiting:**

   - Adjust limits based on your usage patterns
   - Monitor for abuse and adjust accordingly
   - Consider different limits for different user types

3. **Session Cleanup:**
   - Regular cleanup of expired sessions
   - Monitor memory usage in Workers
   - Optimize audit log retention

## Troubleshooting

### Common Issues

#### Token Verification Fails

```bash
# Check JWT secret consistency
echo $JWT_SECRET

# Verify token format
# JWT should have 3 parts: header.payload.signature
```

#### Rate Limiting Errors

```bash
# Check current rate limit status
curl -I https://your-auth-worker.workers.dev/auth/login

# Wait for rate limit window to reset
# Default window is 60 seconds
```

#### Account Lockout

```bash
# Check if account is locked
curl -X POST https://your-auth-worker.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Wait for lockout duration to expire
# Default lockout is 15 minutes
```

### Debug Mode

Enable verbose logging for debugging:

```bash
export PERMISSIONS_TEST_VERBOSE=true
bun jwt-auth-test-client-enhanced.ts comprehensive
```

## Contributing

### Development Setup

1. **Clone Repository:**

   ```bash
   git clone <repository-url>
   cd dashboard-worker
   ```

2. **Install Dependencies:**

   ```bash
   bun install
   ```

3. **Run Tests:**

   ```bash
   bun test
   bun jwt-auth-test-client-enhanced.ts comprehensive
   ```

4. **Start Development Server:**
   ```bash
   wrangler dev
   ```

### Code Standards

- Use TypeScript for all new code
- Follow existing code style and patterns
- Add comprehensive type definitions
- Include security considerations in all changes
- Test all security features thoroughly

## License

This project is part of the Fire22 ecosystem. See the main repository for
licensing information.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the test client output
3. Consult the audit logs for authentication events
4. Contact the development team for production issues

---

**🔐 Remember: Security is an ongoing process. Regular security audits and
updates are essential for maintaining a secure authentication system.**
