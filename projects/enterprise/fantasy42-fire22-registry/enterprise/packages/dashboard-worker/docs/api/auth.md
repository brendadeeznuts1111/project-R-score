# 🔐 Fire22 Dashboard - Authentication API v4.0.0-staging

## Overview

Comprehensive authentication system for Fire22 Dashboard with JWT-based
security, role-based access control, and integration with Fire22 API services.

## Table of Contents

- [Authentication Overview](#authentication-overview)
- [JWT Token Management](#jwt-token-management)
- [Fire22 API Authentication](#fire22-api-authentication)
- [Role-Based Access Control](#role-based-access-control)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Integration Examples](#integration-examples)
- [Troubleshooting](#troubleshooting)

---

## Authentication Overview

### System Architecture

```text
[Client Request] → [JWT Verification] → [Role Check] → [Fire22 API] → [Response]
       ↓                    ↓               ↓              ↓           ↓
   Bearer Token      JWT Validation    RBAC Check    API Token    Data Return
```

### Authentication Flow

1. **Login Request**: Client sends credentials to `/auth/login`
2. **Token Generation**: Server validates and returns JWT token
3. **API Requests**: Client includes JWT token in Authorization header
4. **Token Verification**: Server validates JWT on each request
5. **Role Authorization**: Server checks user permissions for requested resource

---

## JWT Token Management

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "iss": "fire22-dashboard",
    "aud": "fire22-api",
    "role": "admin|agent|customer",
    "permissions": ["read:customers", "write:wagers"],
    "agentId": "agent_123",
    "iat": 1756343072,
    "exp": 1756429472
  }
}
```

### Token Endpoints

#### `POST /auth/login`

**Description**: Authenticate user and receive JWT token

**Request Body**:

```json
{
  "username": "admin",
  "password": "secure_password",
  "agentId": "optional_agent_id"
}
```

**Success Response** (200):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "username": "admin",
    "role": "admin",
    "permissions": ["read:all", "write:all"],
    "agentId": null
  },
  "expiresAt": "2025-08-29T01:01:12.712Z"
}
```

**Error Response** (401):

```json
{
  "success": false,
  "error": "Invalid credentials",
  "code": "AUTH_INVALID_CREDENTIALS"
}
```

#### `POST /auth/refresh`

**Description**: Refresh JWT token before expiration

**Request Headers**:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2025-08-29T01:01:12.712Z"
}
```

#### `POST /auth/logout`

**Description**: Invalidate JWT token

**Request Headers**:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200):

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### `GET /auth/verify`

**Description**: Verify JWT token validity

**Request Headers**:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200):

```json
{
  "valid": true,
  "user": {
    "id": "user_123",
    "username": "admin",
    "role": "admin",
    "permissions": ["read:all", "write:all"],
    "agentId": null
  },
  "expiresAt": "2025-08-29T01:01:12.712Z",
  "timeRemaining": 86400
}
```

---

## Fire22 API Authentication

### API Token Management

Fire22 Dashboard integrates with external Fire22 API services using API tokens.

#### Configuration

```bash
# Environment Variables
FIRE22_API_URL=https://api.fire22.ag
FIRE22_TOKEN=your_fire22_api_token
FIRE22_WEBHOOK_SECRET=webhook_secret_key
```

#### Token Validation Endpoint

```bash
# Test Fire22 API connectivity
curl -X GET http://localhost:3001/api/fire22/auth-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:

```json
{
  "fire22Connection": {
    "status": "connected",
    "apiUrl": "https://api.fire22.ag",
    "tokenValid": true,
    "lastChecked": "2025-08-28T01:01:12.712Z"
  },
  "permissions": {
    "customers": true,
    "agents": true,
    "wagers": true,
    "reports": true
  },
  "rateLimit": {
    "remaining": 4950,
    "limit": 5000,
    "resetAt": "2025-08-28T02:00:00.000Z"
  }
}
```

---

## Role-Based Access Control

### User Roles

1. **Admin**: Full system access
2. **Agent**: Agent-specific data access
3. **Customer**: Limited to own data

### Permission Matrix

| Resource        | Admin         | Agent         | Customer      |
| --------------- | ------------- | ------------- | ------------- |
| All Customers   | ✅ Read/Write | ❌            | ❌            |
| Own Customers   | ✅ Read/Write | ✅ Read/Write | ❌            |
| All Agents      | ✅ Read/Write | ❌            | ❌            |
| Own Agent Data  | ✅ Read/Write | ✅ Read/Write | ❌            |
| All Wagers      | ✅ Read/Write | ❌            | ❌            |
| Agent Wagers    | ✅ Read/Write | ✅ Read/Write | ❌            |
| Own Wagers      | ✅ Read/Write | ✅ Read/Write | ✅ Read       |
| System Settings | ✅ Read/Write | ❌            | ❌            |
| Reports         | ✅ Read/Write | ✅ Read (Own) | ✅ Read (Own) |

### Permission Validation

```javascript
// Example middleware for role-based access
function requireRole(requiredRole) {
  return request => {
    const user = request.user; // From JWT
    const roleHierarchy = { admin: 3, agent: 2, customer: 1 };

    if (roleHierarchy[user.role] >= roleHierarchy[requiredRole]) {
      return true;
    }

    throw new Error('Insufficient permissions');
  };
}
```

---

## API Endpoints

### Authentication Required Endpoints

All API endpoints require valid JWT token except:

- `POST /auth/login`
- `GET /health`
- `GET /` (Dashboard UI)

### Authorization Header Format

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Responses

#### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid JWT token",
  "code": "AUTH_TOKEN_INVALID",
  "timestamp": "2025-08-28T01:01:12.712Z"
}
```

#### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions for this resource",
  "code": "AUTH_INSUFFICIENT_PERMISSIONS",
  "requiredRole": "admin",
  "userRole": "agent",
  "timestamp": "2025-08-28T01:01:12.712Z"
}
```

#### 429 Rate Limited

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60,
  "timestamp": "2025-08-28T01:01:12.712Z"
}
```

---

## Security Features

### JWT Security

1. **HS256 Algorithm**: HMAC SHA-256 signing
2. **Token Expiration**: 24-hour default expiration
3. **Secure Storage**: HttpOnly cookies recommended
4. **Token Refresh**: Automatic refresh before expiration

### API Security

1. **CORS Protection**: Cross-origin request filtering
2. **Rate Limiting**: Request throttling per user/IP
3. **Input Validation**: Request payload sanitization
4. **SQL Injection Prevention**: Parameterized queries

### Security Headers

```javascript
// Automatically added security headers
{
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}
```

### Connection Monitoring

Real-time security monitoring with alerts for:

- Multiple failed login attempts (E6001)
- Suspicious IP patterns (E6002)
- Unusual access patterns (E6003)
- Token manipulation attempts (E6004)

---

## Integration Examples

### Frontend Authentication

```javascript
// Login function
async function login(username, password) {
  const response = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (data.success) {
    localStorage.setItem('token', data.token);
    return data.user;
  }

  throw new Error(data.error);
}

// API request with authentication
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  return fetch(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
```

### Server-Side Verification

```javascript
// JWT verification middleware
async function verifyJWT(request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload;
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
}
```

---

## Troubleshooting

### Common Issues

#### Token Expired

**Problem**: JWT token has expired **Solution**: Refresh token or
re-authenticate

```bash
curl -X POST http://localhost:3001/auth/refresh \
  -H "Authorization: Bearer EXPIRED_TOKEN"
```

#### Invalid Credentials

**Problem**: Username/password incorrect **Solution**: Verify credentials and
account status

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"correct_password"}'
```

#### Insufficient Permissions

**Problem**: User doesn't have required role **Solution**: Check user role and
required permissions

```bash
curl -X GET http://localhost:3001/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Rate Limit Exceeded

**Problem**: Too many requests in short time **Solution**: Implement request
throttling and retry logic

```bash
curl -X GET http://localhost:3001/api/security/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Debug Commands

```bash
# Check authentication status
curl -s http://localhost:3001/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# View security status
curl -s http://localhost:3001/api/security/status \
  -H "Authorization: Bearer YOUR_TOKEN" | jq

# Test Fire22 API connection
curl -s http://localhost:3001/api/fire22/auth-status \
  -H "Authorization: Bearer YOUR_TOKEN" | jq
```

### Log Analysis

```bash
# View authentication logs
curl -s http://localhost:3001/api/logs | jq '.[] | select(.module == "AUTH")'

# Monitor security alerts
curl -s http://localhost:3001/api/security/alerts | jq '.alerts'
```

---

## Environment Configuration

### Required Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Fire22 API Integration
FIRE22_API_URL=https://api.fire22.ag
FIRE22_TOKEN=your_fire22_api_token
FIRE22_WEBHOOK_SECRET=webhook_secret

# Admin Credentials
ADMIN_PASSWORD=secure_admin_password

# Database
DB=cloudflare_d1_binding
```

### Development Setup

```bash
# Set environment variables
export JWT_SECRET=$(openssl rand -base64 32)
export ADMIN_PASSWORD="admin123"
export FIRE22_API_URL="https://api.fire22.ag"

# Start development server
bun run dev:hmr

# Test authentication
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## API Reference Summary

### Authentication Endpoints

- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - User logout
- `GET /auth/verify` - Token verification

### Security Endpoints

- `GET /api/security/status` - Security dashboard
- `GET /api/security/alerts` - Security alerts
- `GET /api/fire22/auth-status` - Fire22 API status

### Protected Resources

- `GET /api/customers` - Customer data (Admin/Agent)
- `GET /api/agents` - Agent data (Admin)
- `GET /api/wagers` - Wager data (Role-based)
- `GET /api/reports` - Reports (Role-based)

---

_Last Updated: 2025-08-28_ _Version: 4.0.0-staging_ _API Documentation for
Fire22 Dashboard Authentication System_
