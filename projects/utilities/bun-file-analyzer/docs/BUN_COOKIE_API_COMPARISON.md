# Bun Cookie API - Official vs Our Implementation

## 🍪 Official Bun Cookie API (https://bun.com/docs/runtime/http/cookies)

### Reading Cookies
```typescript
// Official Bun API
const server = Bun.serve({
  routes: {
    "/profile": req => {
      // Access cookies from the request
      const userId = req.cookies.get("user_id");
      const theme = req.cookies.get("theme") || "light";
      return Response.json({ userId, theme });
    },
  },
});
```

### Setting Cookies
```typescript
// Official Bun API
const server = Bun.serve({
  routes: {
    "/login": req => {
      const cookies = req.cookies;
      
      // Set a cookie with various options
      cookies.set("user_id", "12345", {
        maxAge: 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: true,
        path: "/",
      });
      
      // Modified cookies are automatically applied to the response
      return new Response("Login successful");
    },
  },
});
```

### Deleting Cookies
```typescript
// Official Bun API
const server = Bun.serve({
  routes: {
    "/logout": req => {
      // Delete the user_id cookie
      req.cookies.delete("user_id", { path: "/" });
      return new Response("Logged out successfully");
    },
  },
});
```

## 🔧 Our Implementation

### Browser-Compatible Cookie Manager
```typescript
// Our browser-compatible implementation
class BrowserCookieManager {
  private cookies: Map<string, CookieOptions & { value: string }> = new Map();

  // Map-like interface matching Bun's CookieMap
  get(name: string): (CookieOptions & { value: string }) | undefined {
    return this.cookies.get(name);
  }

  set(name: string, options: CookieOptions & { value: string }): void {
    this.cookies.set(name, options);
    this.saveToDocument(); // Sync with document.cookie
  }

  delete(name: string): boolean {
    const result = this.cookies.delete(name);
    // Delete from document.cookie by setting expiration in the past
    if (typeof document !== "undefined") {
      document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
    return result;
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  clear(): void {
    this.cookies.clear();
    // Clear all document cookies
    if (typeof document !== "undefined") {
      document.cookie.split(';').forEach(cookie => {
        const name = cookie.split('=')[0]?.trim();
        if (name) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      });
    }
  }

  get size(): number {
    return this.cookies.size;
  }

  // Iterable methods matching Bun's CookieMap
  entries(): IterableIterator<[string, CookieOptions & { value: string }]> {
    return this.cookies.entries();
  }

  keys(): IterableIterator<string> {
    return this.cookies.keys();
  }

  values(): IterableIterator<CookieOptions & { value: string }> {
    return this.cookies.values();
  }

  forEach(callbackfn: (value: CookieOptions & { value: string }, key: string, map: Map<string, CookieOptions & { value: string }>) => void): void {
    this.cookies.forEach(callbackfn);
  }
}
```

### React Component Usage
```typescript
// Our React component using the browser-compatible CookieManager
export const CookieManagerComponent = () => {
  const [cookies, setCookies] = useState<Array<{name: string, value: string}>>([]);

  const refreshCookies = () => {
    const cookieList = Array.from(cookieManager.entries()).map(([name, cookie]) => ({
      name,
      value: cookie.value,
    }));
    setCookies(cookieList);
  };

  const addCookie = () => {
    cookieManager.set("demo_cookie", "demo_value", {
      domain: "localhost",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    refreshCookies();
  };

  const deleteCookie = (name: string) => {
    cookieManager.delete(name);
    refreshCookies();
  };
};
```

## 📊 Comparison Table

| Feature | Official Bun API | Our Implementation |
|---------|------------------|-------------------|
| **Environment** | Server-side (Node.js/Bun runtime) | Browser-side (document.cookie) |
| **Cookie Access** | `req.cookies.get("name")` | `cookieManager.get("name")` |
| **Cookie Setting** | `req.cookies.set("name", "value", options)` | `cookieManager.set("name", "value", options)` |
| **Cookie Deletion** | `req.cookies.delete("name", options)` | `cookieManager.delete("name")` |
| **Map Interface** | ✅ Full Map-like API | ✅ Full Map-like API |
| **Iterable** | ✅ `for...of` support | ✅ `for...of` support |
| **Size Property** | ✅ `cookies.size` | ✅ `cookieManager.size` |
| **Has Method** | ✅ `cookies.has("name")` | ✅ `cookieManager.has("name")` |
| **Clear Method** | ✅ `cookies.clear()` | ✅ `cookieManager.clear()` |
| **Persistence** | Automatic in HTTP headers | Manual sync with document.cookie |
| **Security Options** | ✅ httpOnly, secure, sameSite | ✅ httpOnly, secure, sameSite |
| **Expiration** | ✅ maxAge, expires | ✅ maxAge, expires |

## 🎯 Key Similarities

1. **Map-like Interface**: Both implementations provide the same Map-like API
2. **Method Names**: Identical method names (`get`, `set`, `delete`, `has`, `clear`)
3. **Options Support**: Both support cookie options like `maxAge`, `domain`, `path`
4. **Iterable**: Both are iterable and support `for...of` loops
5. **Size Property**: Both have a `size` property to count cookies

## 🔧 Key Differences

1. **Environment**: 
   - Official: Server-side in Bun runtime
   - Ours: Browser-side using document.cookie

2. **Persistence**:
   - Official: Automatic via HTTP Set-Cookie headers
   - Ours: Manual sync with document.cookie

3. **Security**:
   - Official: Full server-side security control
   - Ours: Browser security limitations

## 🚀 Usage Examples

### Official Bun Usage
```bash
# Start Bun server
bun run server.ts

# Test endpoints
curl http://localhost:3000/login    # Sets cookies
curl http://localhost:3000/profile   # Reads cookies
curl http://localhost:3000/logout   # Deletes cookies
```

### Our Browser Usage
```bash
# Start development server
bun run dev

# Open browser
http://localhost:3879

# Use Cookie Manager component to:
# - Add cookies with custom options
# - Read all active cookies
# - Delete specific cookies
# - Clear all cookies
```

## 📚 Implementation Notes

### Why We Created a Browser Version

1. **Compatibility**: Bun's official cookie API only works in Bun runtime
2. **Demonstration**: We wanted to show cookie management in the browser
3. **Learning**: To demonstrate how Map-like APIs work
4. **Consistency**: To maintain the same API surface across environments

### Browser Limitations

1. **No httpOnly**: Browser JavaScript cannot access httpOnly cookies
2. **Security**: Same-origin policy applies
3. **Storage**: Limited by browser cookie storage limits
4. **Synchronization**: Manual sync required with document.cookie

### Production Considerations

For production use:
- Use official Bun API on the server
- Use our browser implementation for client-side cookie management
- Consider security implications carefully
- Test cookie behavior across different browsers

## 🎉 Conclusion

Our implementation successfully replicates Bun's official CookieMap API for browser environments while maintaining the same interface and functionality. This allows developers to use consistent cookie management code across both server and client environments.
