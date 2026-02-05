# 🔐 JWT Authentication with Cloudflare Workers

A complete implementation of JWT (JSON Web Token) authentication system using
Cloudflare Workers, featuring both HTTP Basic Authentication and JWT token
management.

## 🚀 Features

- **HTTP Basic Authentication**: Secure login with username/password
- **JWT Token Generation**: Create signed JWT tokens with HS256 algorithm
- **Token Verification**: Validate JWT tokens and check expiration
- **Protected Routes**: Secure endpoints that require valid JWT tokens
- **Token Refresh**: Refresh expired tokens without re-authentication
- **CORS Support**: Cross-origin resource sharing enabled
- **TypeScript Support**: Full type safety with TypeScript
- **Comprehensive Testing**: Complete test suite with client examples

## 📁 Project Structure

```
dashboard-worker/src/
├── jwt-auth-worker.ts          # Main Cloudflare Worker implementation
├── jwt-auth-test-client.ts     # Test client for demonstration
└── JWT-AUTH-README.md          # This documentation
```

## 🛠️ Installation

### Prerequisites

- Node.js (v16 or higher)
- Bun (recommended) or npm
- Cloudflare Workers account (for deployment)

### Setup

1. **Clone or download the files**

   ```bash
   # Navigate to the dashboard-worker directory
   cd dashboard-worker/src
   ```

2. **Install dependencies**

   ```bash
   bun install
   # or
   npm install
   ```

3. **Configure environment variables** (optional)
   ```bash
   # Create .env file
   echo "JWT_SECRET=your-super-secret-key-change-in-production" > .env
   echo "AUTH_BASE_URL=http://localhost:8787" >> .env
   ```

## 🔧 Configuration

### Environment Variables

| Variable        | Description                   | Default                                | Required |
| --------------- | ----------------------------- | -------------------------------------- | -------- |
| `JWT_SECRET`    | Secret key for JWT signing    | `your-secret-key-change-in-production` | Yes      |
| `AUTH_BASE_URL` | Base URL for the auth service | `http://localhost:8787`                | No       |

### Worker Configuration

The JWT authentication service can be configured by modifying the `AuthConfig`
interface in `jwt-auth-worker.ts`:

```typescript
interface AuthConfig {
  jwtSecret: string; // Secret key for JWT signing
  issuer: string; // JWT issuer
  audience: string; // JWT audience
  tokenExpiry: number; // Token expiration in seconds
}
```

## 🚀 Usage

### Running the Worker

#### Development Mode

```bash
# Start the worker in development mode
bun run dev -- --port 8787
```

#### Production Deployment

```bash
# Deploy to Cloudflare Workers
bun run deploy
```

### API Endpoints

#### 1. Service Information

```
GET /
```

Returns service information and available endpoints.

**Response:**

```json
{
  "message": "Fire22 JWT Authentication Service",
  "version": "1.0.0",
  "endpoints": {
    "basic": "POST /auth/basic - HTTP Basic Auth to get JWT",
    "verify": "POST /auth/verify - Verify JWT token",
    "refresh": "POST /auth/refresh - Refresh JWT token",
    "protected": "GET /protected - Access protected resource"
  }
}
```

#### 2. HTTP Basic Authentication

```
POST /auth/basic
```

Authenticate using HTTP Basic Auth and receive a JWT token.

**Headers:**

```
Authorization: Basic base64(username:password)
```

**Response:**

```json
{
  "message": "Authentication successful",
  "user": {
    "id": "1",
    "username": "admin",
    "role": "admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Token Verification

```
POST /auth/verify
```

Verify a JWT token and return user information.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "message": "Token is valid",
  "user": {
    "id": "1",
    "username": "admin",
    "role": "admin"
  },
  "payload": {
    "sub": "1",
    "username": "admin",
    "role": "admin",
    "iat": 1640995200,
    "exp": 1640998800
  }
}
```

#### 4. Token Refresh

```
POST /auth/refresh
```

Refresh an existing JWT token.

**Headers:**

```
Authorization: Bearer <jwt-token>
```

**Response:**

```json
{
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 5. Protected Route

```
GET /protected
```

Access a protected resource that requires valid JWT authentication.

**Headers:**

```
Authorization: Bearer <jwt-token>
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
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Default Users

The implementation includes two default users for testing:

| Username | Password   | Role    |
| -------- | ---------- | ------- |
| `admin`  | `admin123` | `admin` |
| `user`   | `user123`  | `user`  |

## 🧪 Testing

### Running the Test Client

The test client demonstrates all authentication flows:

```bash
# Run comprehensive test suite
bun run jwt-auth-test-client.ts complete

# Run quick test (basic functionality)
bun run jwt-auth-test-client.ts quick

# Use custom base URL
AUTH_BASE_URL=https://your-worker.your-subdomain.workers.dev bun run jwt-auth-test-client.ts complete
```

### Test Client Features

- **Complete Test Suite**: Tests all authentication flows and security scenarios
- **Quick Test**: Basic functionality verification
- **Error Handling**: Tests invalid credentials, tokens, and missing
  authentication
- **Multiple Users**: Tests both admin and regular user flows
- **Security Validation**: Ensures proper rejection of invalid requests

### Example Test Output

```
🚀 Starting JWT Authentication Test Suite

============================================================
ℹ️ Testing Service Info
✅ Service info retrieved
📝 Message: Fire22 JWT Authentication Service
📋 Version: 1.0.0
🔗 Endpoints:
   basic: POST /auth/basic - HTTP Basic Auth to get JWT
   verify: POST /auth/verify - Verify JWT token
   refresh: POST /auth/refresh - Refresh JWT token
   protected: GET /protected - Access protected resource

🚫 Testing Invalid Credentials
✅ Invalid credentials properly rejected: Invalid credentials

👤 Testing Admin User Flow
----------------------------------------
🔐 Testing Basic Auth for user: admin
✅ Basic Auth successful
👤 User: admin (admin)
🎫 Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

🔍 Testing Token Verification
✅ Token verification successful
👤 User: admin (admin)
📊 Payload: {
  "sub": "1",
  "username": "admin",
  "role": "admin",
  "iat": 1640995200,
  "exp": 1640998800
}

🛡️ Testing Protected Route Access
✅ Protected route access successful
👤 User: admin (admin)
🔐 Secret: This is protected data only accessible with valid JWT
⏰ Timestamp: 2024-01-01T00:00:00.000Z

🔄 Testing Token Refresh
✅ Token refresh successful
🎫 New Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

============================================================
🎉 JWT Authentication Test Suite Complete!

✅ All tests completed successfully!
✅ HTTP Basic Authentication working
✅ JWT Token generation and verification working
✅ Protected route access control working
✅ Token refresh functionality working
✅ Security validation working
✅ CORS support working
```

## 🔒 Security Features

### JWT Implementation

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Signature**: Cryptographic signature verification
- **Expiration**: Token expiration validation
- **Payload**: User information and metadata
- **Base64 URL Encoding**: Safe for URL usage

### Security Headers

- **CORS**: Configured for cross-origin requests
- **WWW-Authenticate**: Proper authentication challenge headers
- **Content-Type**: JSON content type enforcement
- **Authorization**: Bearer token support

### Error Handling

- **Invalid Credentials**: Proper 401 responses
- **Expired Tokens**: Token expiration validation
- **Invalid Tokens**: Signature verification
- **Missing Authentication**: Proper challenge responses

## 🌐 CORS Configuration

The worker includes CORS support for web applications:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

**Note**: In production, you should restrict `Access-Control-Allow-Origin` to
specific domains.

## 📝 Code Examples

### Basic Authentication Flow

```typescript
// 1. Authenticate with Basic Auth
const response = await fetch('/auth/basic', {
  method: 'POST',
  headers: {
    Authorization: 'Basic ' + btoa('admin:admin123'),
  },
});

const { token } = await response.json();

// 2. Use the token for protected requests
const protectedResponse = await fetch('/protected', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const data = await protectedResponse.json();
```

### Token Verification

```typescript
async function verifyToken(token: string) {
  const response = await fetch('/auth/verify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    const { user, payload } = await response.json();
    console.log('User:', user);
    console.log('Token expires at:', new Date(payload.exp * 1000));
    return true;
  } else {
    console.log('Token is invalid or expired');
    return false;
  }
}
```

### Token Refresh

```typescript
async function refreshToken(currentToken: string) {
  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${currentToken}`,
    },
  });

  if (response.ok) {
    const { token } = await response.json();
    return token; // New token
  } else {
    throw new Error('Token refresh failed');
  }
}
```

## 🚀 Deployment

### Cloudflare Workers Deployment

1. **Install Wrangler CLI**

   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**

   ```bash
   wrangler login
   ```

3. **Configure Wrangler** Update `wrangler.toml`:

   ```toml
   name = "jwt-auth-worker"
   main = "src/jwt-auth-worker.ts"
   compatibility_date = "2024-01-01"
   ```

4. **Deploy**
   ```bash
   wrangler deploy
   ```

### Environment Variables in Production

Set environment variables in your Cloudflare Workers dashboard:

```bash
# Using Wrangler
wrangler secret put JWT_SECRET
wrangler secret put AUTH_BASE_URL
```

## 🔧 Customization

### Adding New Users

Modify the `initializeUsers()` method in `jwt-auth-worker.ts`:

```typescript
private initializeUsers(): void {
  this.users.set('newuser', {
    id: '3',
    username: 'newuser',
    password: 'newpassword', // Use bcrypt in production
    role: 'user'
  });
}
```

### Custom Token Payload

Extend the `JWTPayload` interface:

```typescript
interface JWTPayload {
  sub: string;
  username: string;
  role: string;
  email?: string; // Add custom fields
  permissions?: string[]; // Add custom fields
  iat: number;
  exp: number;
}
```

### Custom Token Expiration

Modify the `AuthConfig`:

```typescript
const config: AuthConfig = {
  jwtSecret: 'your-secret-key',
  issuer: 'your-app',
  audience: 'your-api',
  tokenExpiry: 7200, // 2 hours instead of 1 hour
};
```

## 🐛 Troubleshooting

### Common Issues

1. **Token Verification Fails**

   - Check if the JWT secret matches between generation and verification
   - Verify the token hasn't expired
   - Ensure the token is properly formatted

2. **CORS Errors**

   - Check that the `Access-Control-Allow-Origin` header is properly set
   - Verify the request includes the `Authorization` header in CORS preflight

3. **Authentication Fails**
   - Verify username and password are correct
   - Check that the Basic Auth header is properly formatted
   - Ensure the worker is running and accessible

### Debug Mode

Enable verbose logging by setting the environment variable:

```bash
export DEBUG_AUTH=true
```

## 📚 API Reference

### JWTAuthService Class

#### Methods

- `generateToken(username: string, password: string): Promise<string | null>`
- `verifyToken(token: string): Promise<JWTPayload | null>`
- `basicAuth(authorizationHeader: string | null): Promise<User | null>`
- `extractToken(authorizationHeader: string | null): string | null`

### AuthWorker Class

#### Methods

- `handleBasicAuth(request: Request): Promise<Response>`
- `handleJWTAuth(request: Request): Promise<Response>`
- `handleProtectedRoute(request: Request): Promise<Response>`
- `handleTokenRefresh(request: Request): Promise<Response>`
- `handleRequest(request: Request): Promise<Response>`

### Interfaces

```typescript
interface JWTPayload {
  sub: string; // Subject (user ID)
  username: string; // Username
  role: string; // User role
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}

interface User {
  id: string; // User ID
  username: string; // Username
  password: string; // Password (hashed in production)
  role: string; // User role
}

interface AuthConfig {
  jwtSecret: string; // JWT signing secret
  issuer: string; // JWT issuer
  audience: string; // JWT audience
  tokenExpiry: number; // Token expiration in seconds
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🔗 Related Resources

- [JWT Specification](https://tools.ietf.org/html/rfc7519)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [HTTP Basic Authentication](https://tools.ietf.org/html/rfc7617)
- [CORS Specification](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Note**: This implementation is designed for demonstration purposes. In
production, you should:

- Use a proper database for user storage
- Implement password hashing with bcrypt
- Use environment variables for sensitive configuration
- Implement rate limiting and security headers
- Add proper logging and monitoring
- Use HTTPS in production environments
