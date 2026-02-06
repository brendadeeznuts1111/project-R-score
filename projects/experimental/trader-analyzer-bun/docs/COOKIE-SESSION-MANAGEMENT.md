# Cookie-Based Session Management

> Secure session management using Bun's native cookie APIs (`Bun.Cookie` and `Bun.CookieMap`) with `Bun.randomUUIDv7()` for all API endpoints, dashboards, and HTML pages

**Subsystem Reference**: `10.0.0.0.0.0.0` - Authentication & Session Management Subsystem  
**Complete Documentation**: `docs/10.0.0.0.0.0.0-AUTHENTICATION-SESSION-MANAGEMENT.md`

## Overview

NEXUS implements cookie-based session management across all API endpoints, dashboards, and HTML pages using Bun's native cookie APIs:
- **Bun.CookieMap** - Native cookie parsing and management
- **Bun.Cookie** - Cookie object with security attributes
- **Bun.randomUUIDv7()** - Cryptographically secure, time-ordered session IDs
- **HTTP-only cookies** - XSS protection
- **SameSite strict** - CSRF protection
- **Secure flag** - HTTPS-only in production

**Pattern References:**
- `7.18.1.0.0.0.0` - Bun.serve() Cookie Support
- `7.18.2.0.0.0.0` - Bun.CookieMap Cookie Parsing & Management
- `7.2.1.0.0.0.0` - Bun.randomUUIDv7() for session IDs

**Official Bun Documentation:** 
- [Cookies API](https://bun.sh/docs/api/cookies) - Complete cookie API reference
- [BunRequest.cookies](https://bun.sh/docs/runtime/yaml#cookies) - Native cookie integration in Bun.serve()

**Key Features (Official Bun API):**
- `BunRequest.cookies` is automatically a `CookieMap` instance
- `Bun.serve()` automatically tracks `request.cookies.set()` and applies to response
- No manual header manipulation required
- Deleted cookies automatically become `Set-Cookie` headers with `maxAge=0`

---

## API Endpoints

### Sign In

**POST** `/api/users/sign-in`

Create a new session and set `sessionId` cookie.

**Request:**
```json
{
  "userId": "optional-user-id"
}
```

**Response:**
```json
{
  "message": "Signed in",
  "sessionId": "018f1234-5678-9abc-def0-123456789abc",
  "userId": "optional-user-id",
  "expiresAt": "2025-12-14T18:00:00.000Z"
}
```

**Cookie Set:**
```text
sessionId=018f1234-5678-9abc-def0-123456789abc; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800
```

### Sign Out

**POST** `/api/users/sign-out`

Delete session and clear `sessionId` cookie.

**Response:**
```json
{
  "message": "Signed out"
}
```

### Get Session Status

**GET** `/api/users/session`

Get current session information.

**Response (authenticated):**
```json
{
  "authenticated": true,
  "userId": "optional-user-id",
  "createdAt": "2025-12-07T18:00:00.000Z",
  "expiresAt": "2025-12-14T18:00:00.000Z"
}
```

**Response (not authenticated):**
```json
{
  "authenticated": false
}
```

---

## Implementation Details

### Using Bun.CookieMap

Bun provides native cookie APIs that work seamlessly with HTTP servers:

```typescript
// Parse cookies from request headers
const cookieHeader = request.headers.get('cookie') || '';
const cookies = new Bun.CookieMap(cookieHeader);

// Get session cookie
const sessionId = cookies.get('sessionId');

// Set cookie with security options
cookies.set('sessionId', Bun.randomUUIDv7(), {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/'
});

// Delete cookie
cookies.delete('sessionId');
```

### Using Bun.Cookie

Create cookie objects with full control:

```typescript
import { Cookie } from 'bun';

const sessionCookie = new Bun.Cookie('sessionId', Bun.randomUUIDv7(), {
  domain: 'example.com',
  path: '/',
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60
});

// Check if expired
if (sessionCookie.isExpired()) {
  // Handle expired cookie
}

// Serialize to Set-Cookie header
const headerValue = sessionCookie.serialize();
```

### Session Storage

Sessions are stored in-memory (can be migrated to Redis/DB):

```typescript
const sessions = new Map<string, {
  userId: string;
  createdAt: number;
  expiresAt: number;
}>();
```

### Session Validation Middleware

Use `requireSession` middleware to protect endpoints:

```typescript
import { requireSession } from './middleware/session';

api.get("/protected-endpoint", requireSession, async (c) => {
  const session = c.get("session");
  return c.json({ userId: session.userId });
});
```

### Cookie Security Options (Bun.CookieInit)

- `httpOnly: boolean` - Prevents JavaScript access (XSS protection)
- `sameSite: "strict" | "lax" | "none"` - CSRF protection
- `secure: boolean` - HTTPS only (enabled in production)
- `maxAge: number` - Expiration in seconds
- `expires: Date` - Expiration date (alternative to maxAge)
- `path: string` - URL path scope (defaults to "/")
- `domain: string` - Domain scope
- `partitioned: boolean` - CHIPS partitioned cookie support

---

## Dashboard Integration

### Session Status Indicator

The dashboard displays session status in the header:

- **✓ Authenticated** (green) - Session active
- **Not signed in** (gray) - No active session
- **Error** (red) - Session check failed

### Sign In/Out Buttons

- **Sign In** button appears when not authenticated
- **Sign Out** button appears when authenticated

### API Fetch Helper

All dashboard API calls use `apiFetch()` helper with cookie support:

```javascript
function apiFetch(url, options = {}) {
    return fetch(url, {
        ...options,
        credentials: 'include', // Always include cookies
        mode: 'cors'
    });
}
```

### Session Check Function

```javascript
async function checkSession() {
    const response = await apiFetch(`${API_BASE}/api/users/session`);
    const data = await response.json();
    
    if (data.authenticated) {
        // Update UI to show authenticated state
    } else {
        // Update UI to show sign-in button
    }
}
```

---

## HTML Page Integration

### Include Cookie Support

All HTML pages should:

1. **Include credentials in fetch calls:**
```javascript
fetch(url, {
    credentials: 'include', // Include cookies
    mode: 'cors'
})
```

2. **Check session on page load:**
```javascript
async function checkSession() {
    const response = await fetch('/api/users/session', {
        credentials: 'include'
    });
    // Handle session state
}
```

3. **Provide sign-in/sign-out UI:**
```html
<button onclick="signIn()">Sign In</button>
<button onclick="signOut()">Sign Out</button>
```

---

## CORS Configuration

CORS is configured to allow cookies:

```typescript
api.use("/*", cors({
    origin: "*",
    credentials: true, // Allow cookies in CORS
    exposeHeaders: ["Set-Cookie", ...]
}));
```

**Important:** When using credentials, browsers require:
- Explicit `credentials: 'include'` in fetch calls
- Valid CORS origin (not `*` in production)
- HTTPS in production (for secure cookies)

---

## Security Best Practices

1. **Always use `httpOnly: true`** - Prevents XSS attacks
2. **Use `sameSite: "strict"`** - Prevents CSRF attacks
3. **Set `secure: true` in production** - HTTPS only
4. **Use `Bun.randomUUIDv7()`** - Cryptographically secure IDs
5. **Set appropriate `maxAge`** - Balance security and UX
6. **Validate session expiration** - Check `expiresAt` on each request
7. **Clear expired sessions** - Clean up old sessions periodically

---

## Migration from Token-Based Auth

If migrating from token-based authentication:

1. **Replace Authorization headers** with cookie-based sessions
2. **Update all fetch calls** to include `credentials: 'include'`
3. **Update CORS config** to allow credentials
4. **Add session validation middleware** to protected endpoints
5. **Update dashboards** to check session status

---

## Bun.CookieMap Methods

### Core Methods

- `get(name: string): string | null` - Get cookie value
- `has(name: string): boolean` - Check if cookie exists
- `set(name: string, value: string, options?: CookieInit): void` - Set cookie
- `set(options: CookieInit): void` - Set cookie from options object
- `set(cookie: Cookie): void` - Set cookie from Cookie instance
- `delete(name: string): void` - Delete cookie
- `delete(options: CookieStoreDeleteOptions): void` - Delete with domain/path
- `toJSON(): Record<string, string>` - Convert to plain object
- `toSetCookieHeaders(): string[]` - Generate Set-Cookie headers

### Iteration Methods

```typescript
// Iterate over [name, value] pairs
for (const [name, value] of cookies) {
  console.log(`${name}: ${value}`);
}

// Using entries()
for (const [name, value] of cookies.entries()) {
  console.log(`${name}: ${value}`);
}

// Using keys()
for (const name of cookies.keys()) {
  console.log(name);
}

// Using values()
for (const value of cookies.values()) {
  console.log(value);
}

// Using forEach
cookies.forEach((value, name) => {
  console.log(`${name}: ${value}`);
});
```

### Properties

- `size: number` - Number of cookies in the map

## Bun.Cookie Methods

### Instance Methods

- `isExpired(): boolean` - Check if cookie has expired
- `serialize(): string` - Serialize to Set-Cookie header string
- `toString(): string` - Alias for serialize()
- `toJSON(): CookieInit` - Convert to plain object

### Static Methods

- `Cookie.parse(cookieString: string): Cookie` - Parse cookie string
- `Cookie.from(name: string, value: string, options?: CookieInit): Cookie` - Factory method

## Cross-References

- **Pattern:** `7.18.1.0.0.0.0` - Bun.serve() Cookie Support
- **Cookie Parsing:** `7.18.2.0.0.0.0` - Bun.CookieMap
- **UUID Generation:** `7.2.1.0.0.0.0` - Bun.randomUUIDv7()
- **Bun Documentation:** [Cookies API](https://bun.sh/docs/api/cookies)
- **API Routes:** `src/api/routes.ts`
- **Cookie Utils:** `src/utils/bun-cookie.ts`
- **Dashboard:** `dashboard/index.html`
- **Registry:** `dashboard/registry.html`

---

## Examples

### Complete Sign-In Flow

```typescript
// 1. Sign in
const signInResponse = await fetch('/api/users/sign-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userId: 'user123' })
});

// 2. Cookie is automatically set by browser
// sessionId=018f1234-5678-9abc-def0-123456789abc; HttpOnly; SameSite=Strict

// 3. Subsequent requests include cookie automatically
const dataResponse = await fetch('/api/protected-data', {
    credentials: 'include' // Cookie sent automatically
});

// 4. Sign out
await fetch('/api/users/sign-out', {
    method: 'POST',
    credentials: 'include'
});
```

### Using Bun.CookieMap in Server Code

**Official Bun Pattern**: `BunRequest.cookies` is automatically a `CookieMap` instance. `Bun.serve()` automatically tracks cookie changes and applies them to responses.

```typescript
// In Bun.serve() routes - Official Bun Pattern
Bun.serve({
  routes: {
    "/api/session": (req) => {
      // Access request cookies (automatically parsed)
      // req.cookies is automatically a Bun.CookieMap instance
      const sessionId = req.cookies.get("sessionId");
      
      if (!sessionId) {
        return new Response("Unauthorized", { status: 401 });
      }
      
      // Set new cookie - automatically applied to response
      req.cookies.set("lastAccess", Date.now().toString(), {
        httpOnly: true,
        sameSite: "strict",
        maxAge: 3600
      });
      
      // No manual header manipulation needed!
      // Bun.serve() automatically applies Set-Cookie headers
      return new Response("OK");
    }
  }
});
```

**Reading Cookies** (Official Pattern):

```typescript
Bun.serve({
  routes: {
    "/profile": (req) => {
      // Access cookies from the request
      const userId = req.cookies.get("user_id");
      const theme = req.cookies.get("theme") || "light";

      return Response.json({
        userId,
        theme,
        message: "Profile page",
      });
    },
  },
});
```

**Setting Cookies** (Official Pattern):

```typescript
Bun.serve({
  routes: {
    "/login": (req) => {
      // Set a cookie with various options
      req.cookies.set("user_id", "12345", {
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: true,
        path: "/",
      });

      // Add a theme preference cookie
      req.cookies.set("theme", "dark");

      // Modified cookies from the request are automatically applied to the response
      return new Response("Login successful");
    },
  },
});
```

**Deleting Cookies** (Official Pattern):

```typescript
Bun.serve({
  routes: {
    "/logout": (req) => {
      // Delete the user_id cookie
      req.cookies.delete("user_id", {
        path: "/", // Must match original cookie path
      });

      // Deleted cookies become a Set-Cookie header with maxAge=0 and empty value
      return new Response("Logged out successfully");
    },
  },
});
```

### Using Bun.CookieMap with Hono

```typescript
import { Hono } from 'hono';
import { cookieUtils } from '../utils/bun-cookie';

const api = new Hono();

api.post("/users/sign-in", async (c) => {
  // Parse cookies from request headers
  const cookies = cookieUtils.fromHeaders(c.req.raw.headers);
  
  // Generate session ID
  const sessionId = Bun.randomUUIDv7();
  
  // Set cookie using Bun.CookieMap
  cookies.set("sessionId", sessionId, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/"
  });
  
  // Apply cookies to response
  const setCookieHeaders = cookies.toSetCookieHeaders();
  setCookieHeaders.forEach(header => {
    c.header("Set-Cookie", header);
  });
  
  return c.json({ message: "Signed in", sessionId });
});
```

### Protected Endpoint Example

```typescript
api.get("/api/protected-data", requireSession, async (c) => {
    const session = c.get("session");
    
    return c.json({
        data: "protected data",
        userId: session.userId,
        sessionCreated: new Date(session.createdAt).toISOString()
    });
});
```

---

## Troubleshooting

### Cookies Not Being Sent

**Problem:** Cookies not included in requests

**Solution:**
- Ensure `credentials: 'include'` in fetch calls
- Check CORS config allows credentials
- Verify cookie domain/path matches request URL
- Check browser console for cookie warnings

### Session Expired Immediately

**Problem:** Session expires right after creation

**Solution:**
- Check system clock synchronization
- Verify `expiresAt` calculation
- Check session cleanup logic

### CORS Errors with Cookies

**Problem:** CORS errors when using cookies

**Solution:**
- Set `credentials: true` in CORS config
- Use specific origin (not `*`) in production
- Ensure `credentials: 'include'` in fetch calls

---

## Future Enhancements

- [ ] Redis session storage for scalability
- [ ] Session refresh mechanism
- [ ] Multi-device session management
- [ ] Session activity tracking
- [ ] Remember me functionality
- [ ] Session revocation API

---

**Last Updated:** 2025-12-07  
**Pattern Version:** 7.18.1.0.0.0.0
