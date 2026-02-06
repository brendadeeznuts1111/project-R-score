# 🚀 Enhanced API Integration with Fire22 Security

This document provides comprehensive guidance on using the enhanced API
integration that extends your existing Fire22 security infrastructure with JWT
tokens, enhanced headers, and comprehensive security features.

## 🚀 Overview

The Enhanced API Integration provides:

- **JWT Token Authentication**: Secure token-based authentication with automatic
  refresh
- **Enhanced Security Headers**: Comprehensive security headers and validation
- **Protected Resource Access**: Secure access to protected API endpoints
- **Security Monitoring**: Comprehensive audit logging and security monitoring
- **Fire22 Integration**: Seamless integration with enhanced security
  infrastructure

## 📋 Prerequisites

- Enhanced Security Integration configured (`bun run enhanced:setup`)
- Cloudflare Worker deployed (optional, for testing)
- Bun runtime for development and testing

## 🔧 Quick Start

### 1. **Enhanced API Service Setup**

````typescript
```javascript
import { EnhancedAPIService } from './src/api/enhanced-api-service';
````text

// Initialize with enhanced security const api = new EnhancedAPIService({
baseURL: 'https://api.fire22.com', apiVersion: 'v1', securityLevel: 'enhanced',
timeout: 30000, retryAttempts: 3 });

````

### 2. **Authentication Flow**

```typescript
// Login and get tokens
const loginResponse = await api.login({
  username: 'fire22_user',
  password: 'secure_password_123'
});

if (loginResponse.ok) {
  const data = await loginResponse.json();
  console.log('Access Token:', data.access_token);
  console.log('Token Type:', data.token_type);
  console.log('Expires In:', data.expires_in);
  console.log('Scope:', data.scope);
}

// Verify token
const verifyResponse = await api.verifyToken();

// Access protected resources
const protectedData = await api.getProtectedResource('/api/v1/protected');
````

### 3. **Enhanced Security Headers**

The API service automatically includes enhanced security headers:

```typescript
// Request includes these headers automatically:
{
  'Authorization': 'Bearer <jwt_token>',
  'X-API-Version': 'v1',
  'X-Client-ID': 'fire22_<unique_id>',
  'X-Fire22-Security': 'enhanced',
  'X-Request-ID': 'req_<timestamp>_<random>',
  'User-Agent': 'Fire22-Dashboard/3.0.9 (Enhanced Security)',
  'X-CSRF-Token': '<csrf_token>'
}
```

## 🛡️ **Enhanced Security Features**

### **JWT Token Management**

- **Automatic Token Refresh**: Tokens refresh automatically on expiry
- **Secure Storage**: Tokens stored securely in sessionStorage
- **Token Validation**: Comprehensive JWT validation and verification
- **Scope Management**: Role-based access control with token scopes

### **Security Headers**

- **X-API-Version**: API version tracking
- **X-Client-ID**: Unique client identification
- **X-Fire22-Security**: Security level indication
- **X-Request-ID**: Request tracing and correlation
- **X-CSRF-Token**: Cross-site request forgery protection

### **Rate Limiting and Security**

- **IP-based Rate Limiting**: Prevents abuse and DDoS attacks
- **Request Validation**: Comprehensive header and payload validation
- **Security Monitoring**: Real-time security event logging
- **Audit Trail**: Complete request/response audit logging

## 🔐 **Authentication Endpoints**

### **Login**

```typescript
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "fire22_user",
  "password": "secure_password_123"
}

// Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "read write admin"
}
```

### **Token Verification**

```typescript
GET /api/v1/auth/verify
Authorization: Bearer <access_token>

// Response
{
  "valid": true,
  "user": "fire22_user",
  "scope": "read write admin",
  "expires": 1640995200,
  "issued": 1640991600
}
```

### **Token Refresh**

```typescript
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "<refresh_token>"
}

// Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### **Logout**

```typescript
POST /api/v1/auth/logout
Authorization: Bearer <access_token>

// Response
{
  "message": "Logged out successfully"
}
```

## 🛡️ **Protected Resource Access**

### **GET Protected Resource**

```typescript
const response = await api.getProtectedResource('/api/v1/users/profile');
```

### **POST Protected Resource**

```typescript
const response = await api.postProtectedResource('/api/v1/users', {
  name: 'John Doe',
  email: 'john@fire22.com',
});
```

### **PUT Protected Resource**

```typescript
const response = await api.putProtectedResource('/api/v1/users/123', {
  name: 'John Updated',
  email: 'john.updated@fire22.com',
});
```

### **DELETE Protected Resource**

```typescript
const response = await api.deleteProtectedResource('/api/v1/users/123');
```

## 📊 **Security Monitoring and Audit**

### **Security Status**

```typescript
const status = api.getSecurityStatus();
console.log('Security Status:', status);

// Output
{
  authenticated: true,
  tokenExpired: false,
  securityLevel: 'enhanced',
  clientId: 'fire22_abc123_1640991600'
}
```

### **Audit Logging**

The API service automatically logs security events:

- **Request Start**: When API requests begin
- **Request Success**: Successful API responses
- **Request Error**: Failed API requests
- **Token Refresh**: Authentication token refreshes
- **Security Events**: Security-related activities

### **Security Event Types**

```typescript
// Security audit events logged automatically
{
  timestamp: '2024-01-01T12:00:00.000Z',
  event: 'request_start',
  data: {
    endpoint: '/api/v1/protected',
    method: 'GET',
    requestId: 'req_1640991600_abc123',
    securityLevel: 'enhanced'
  },
  securityLevel: 'enhanced',
  clientId: 'fire22_abc123_1640991600'
}
```

## 🔧 **Configuration Options**

### **API Configuration**

```typescript
interface APIConfig {
  baseURL: string; // API base URL
  apiVersion: string; // API version (e.g., 'v1')
  clientId: string; // Client identifier
  timeout: number; // Request timeout in milliseconds
  retryAttempts: number; // Number of retry attempts
  securityLevel: 'standard' | 'enhanced' | 'strict';
}
```

### **Security Levels**

| Level      | Description                 | Features                                    |
| ---------- | --------------------------- | ------------------------------------------- |
| `standard` | Basic security              | JWT tokens, basic headers                   |
| `enhanced` | Enhanced security (default) | All standard + enhanced headers, monitoring |
| `strict`   | Maximum security            | All enhanced + additional validations       |

### **Update Configuration**

```typescript
// Update security configuration dynamically
api.updateSecurityConfig({
  securityLevel: 'strict',
  timeout: 45000,
  retryAttempts: 5,
});
```

## 🚀 **Cloudflare Worker Integration**

### **Enhanced Security Worker**

The enhanced Cloudflare Worker provides:

- **JWT Validation**: Comprehensive JWT token verification
- **Rate Limiting**: IP-based rate limiting with configurable windows
- **Security Headers**: Enhanced CORS and security headers
- **Audit Logging**: Complete request/response audit logging
- **Origin Validation**: Strict origin validation and CORS control

### **Worker Endpoints**

| Endpoint                  | Method | Description                 |
| ------------------------- | ------ | --------------------------- |
| `/api/v1/auth/login`      | POST   | User authentication         |
| `/api/v1/auth/refresh`    | POST   | Token refresh               |
| `/api/v1/auth/verify`     | GET    | Token verification          |
| `/api/v1/auth/logout`     | POST   | User logout                 |
| `/api/v1/protected`       | GET    | Protected resource access   |
| `/api/v1/security/status` | GET    | Security status information |

### **Worker Security Features**

- **CORS Configuration**: Strict origin validation
- **Rate Limiting**: Configurable rate limiting per IP
- **Security Headers**: Comprehensive security headers
- **JWT Management**: Token generation, validation, and refresh
- **Audit Logging**: Security event tracking and monitoring

## 📱 **Frontend Integration**

### **HTML Meta Tags**

```html
<!doctype html>
<html>
  <head>
    <meta name="csrf-token" content="<csrf_token_value>" />
    `&lt;meta name="api-base-url" content="https://api.fire22.com"&gt;`
    `&lt;meta name="api-version" content="v1"&gt;`
  </head>
  <body>
    <!-- Your dashboard content -->
  </body>
</html>
```

### **JavaScript Integration**

```javascript
// Initialize enhanced API service
const api = new EnhancedAPIService({
  baseURL: document.querySelector('meta[name="api-base-url"]').content,
  apiVersion: document.querySelector('meta[name="api-version"]').content,
  securityLevel: 'enhanced',
});

// Login user
async function loginUser(username, password) {
  try {
    const response = await api.login({ username, password });
    if (response.ok) {
      console.log('Login successful');
      // Redirect to dashboard
    } else {
      console.error('Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
  }
}

// Access protected data
async function loadUserProfile() {
  try {
    const response = await api.getProtectedResource('/api/v1/users/profile');
    if (response.ok) {
      const profile = await response.json();
      console.log('User profile:', profile);
    }
  } catch (error) {
    console.error('Profile load error:', error);
  }
}
```

## 🧪 **Testing and Development**

### **Run Enhanced API Demo**

```bash
# Run comprehensive API demo
bun run api:enhanced:demo

# Test enhanced API service
bun run api:enhanced:test

# Test enhanced security worker
bun run worker:enhanced:test
```

### **Demo Features**

The demo showcases:

1. **Authentication Flow**: Complete login/logout workflow
2. **Enhanced Security Headers**: Security header validation
3. **Token Management**: Token refresh and lifecycle
4. **Error Handling**: Comprehensive error handling and retry logic
5. **Security Monitoring**: Security audit and monitoring features
6. **Fire22 Integration**: Enhanced security infrastructure integration

### **Development Testing**

```typescript
// Test with different security levels
const testApi = new EnhancedAPIService({
  baseURL: 'http://localhost:3000',
  securityLevel: 'strict',
});

// Test error handling
try {
  await testApi.request('/api/v1/nonexistent');
} catch (error) {
  console.log('Error handled:', error.message);
}
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **JWT Token Issues**

```bash
# Check token status
const status = api.getSecurityStatus();
console.log('Token status:', status);

# Verify token manually
const response = await api.verifyToken();
```

#### **Security Header Issues**

```bash
# Check security headers
const response = await api.request('/api/v1/security/status');
console.log('Security headers:', response.headers);
```

#### **Rate Limiting Issues**

```bash
# Check rate limit headers
const response = await api.request('/api/v1/protected');
console.log('Rate limit remaining:', response.headers.get('X-RateLimit-Remaining'));
console.log('Rate limit reset:', response.headers.get('X-RateLimit-Reset'));
```

### **Debug Mode**

```typescript
// Enable debug logging
if (process.env.NODE_ENV === 'development') {
  console.log('🔒 Security Audit:', auditLog);
}

// Check security configuration
const config = api.getSecurityStatus();
console.log('Security config:', config);
```

## 📚 **API Reference**

### **EnhancedAPIService Class**

```typescript
class EnhancedAPIService {
  // Constructor
  constructor(config: Partial<APIConfig> = {});

  // Authentication
  async login(credentials: {
    username: string;
    password: string;
  }): Promise<Response>;
  async logout(): Promise<Response>;
  async verifyToken(): Promise<Response>;
  async refreshAuthToken(): Promise<boolean>;

  // Protected Resources
  async getProtectedResource(endpoint: string): Promise<Response>;
  async postProtectedResource(endpoint: string, data: any): Promise<Response>;
  async putProtectedResource(endpoint: string, data: any): Promise<Response>;
  async deleteProtectedResource(endpoint: string): Promise<Response>;

  // Security
  getSecurityStatus(): SecurityStatus;
  updateSecurityConfig(updates: Partial<APIConfig>): void;
  clearTokens(): void;

  // Core
  async request(endpoint: string, options?: RequestInit): Promise<Response>;
}
```

### **Interfaces**

```typescript
interface APIConfig {
  baseURL: string;
  apiVersion: string;
  clientId: string;
  timeout: number;
  retryAttempts: number;
  securityLevel: 'standard' | 'enhanced' | 'strict';
}

interface SecurityHeaders {
  Authorization?: string;
  'X-API-Version': string;
  'X-Client-ID': string;
  'X-CSRF-Token'?: string;
  'X-Fire22-Security': string;
  'X-Request-ID': string;
  'User-Agent': string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}
```

## 🚀 **Best Practices**

### **Security Configuration**

1. **Use Enhanced Security**: Always use `enhanced` or `strict` security levels
2. **Token Management**: Implement proper token refresh and storage
3. **Header Validation**: Validate all security headers in requests
4. **Rate Limiting**: Respect rate limits and implement backoff strategies

### **Error Handling**

1. **Comprehensive Error Handling**: Handle all error scenarios gracefully
2. **Retry Logic**: Implement exponential backoff for failed requests
3. **User Feedback**: Provide clear error messages to users
4. **Logging**: Log all errors for debugging and monitoring

### **Performance**

1. **Request Optimization**: Minimize unnecessary API calls
2. **Caching**: Implement appropriate caching strategies
3. **Connection Management**: Reuse connections when possible
4. **Monitoring**: Monitor API performance and response times

## 🔗 **Related Documentation**

- [Enhanced Security Integration](./ENHANCED-SECURITY-INTEGRATION.md)
- [Enhanced Security Quick Start](./ENHANCED-SECURITY-QUICKSTART.md)
- [Fire22 Security Documentation](./SECURITY-DOCUMENTATION.md)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

## 📞 **Support**

For issues with the enhanced API integration:

1. Check this documentation first
2. Run the demo: `bun run api:enhanced:demo`
3. Check security status: `bun run enhanced:audit`
4. Review security logs and audit trails
5. Contact the Fire22 development team

---

**Last Updated**: December 2024  
**Version**: 3.0.0  
**Fire22 Dashboard Worker**: Enhanced API Integration
