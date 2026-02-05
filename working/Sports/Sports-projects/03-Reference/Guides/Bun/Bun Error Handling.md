---
title: Bun error handling
type: reference
status: active
version: 1.0.0
created: 2025-11-14
updated: 2025-11-14
modified: 2025-11-15
category: reference
description: Documentation for Bun Error Handling
acceptEncoding: ""
acceptLanguage: ""
asn: ""
author: Sports Analytics Team
browser: ""
browserName: ""
browserVersion: ""
cacheControl: ""
city: ""
connectionType: ""
cookies: {}
cookiesRaw: ""
countryCode: ""
countryName: ""
deprecated: false
deviceBrand: ""
deviceModel: ""
deviceType: ""
dns: ""
e_tag: ""
etag: ""
ip: ""
ip4: ""
ip6: ""
ipv4: ""
ipv6: ""
isBot: false
isGeoBlocked: false
isMobile: false
isp: ""
latitude: ""
longitude: ""
os: ""
osName: ""
osVersion: ""
referer: ""
referrer: ""
regionCode: ""
regionName: ""
replaces: ""
requestId: ""
requestMethod: GET
requestPath: ""
tags: []
timezone: ""
usage: ""
user_agent: ""
userAgentRaw: ""
xff: []
xForwardedFor: []
zipCode: ""
---
# Bun Error Handling

> Learn how to handle errors in Bun's development server

**Reference**: [Bun Error Handling](https://bun.com/docs/runtime/http/server#error-handling)

---

## Overview

Bun provides built-in error handling for development servers, including in-browser error pages and custom error handlers. This makes debugging easier during development while allowing custom error responses in production.

---

## Development Mode Error Pages

### Activating Development Mode

To activate development mode and enable Bun's built-in error pages, set `development: true`:

```typescript
Bun.serve({
  development: true, // Enable development mode
  
  fetch(req) {
    throw new Error("woops!");
  },
});
```

In development mode, Bun will surface errors in-browser with a built-in error page showing:
- Error message
- Stack trace
- File location
- Line numbers
- Helpful debugging information

---

## Custom Error Handler

### Basic Error Handler

To handle server-side errors with a custom response, implement an `error` handler:

```typescript
Bun.serve({
  fetch(req) {
    throw new Error("woops!");
  },
  
  error(error) {
    return new Response(`<pre>${error}\n${error.stack}</pre>`, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  },
});
```

**Note**: The custom `error` handler response will supersede Bun's default error page in `development` mode.

---

## Advanced Error Handling Patterns

### JSON Error Responses

```typescript
Bun.serve({
  fetch(req) {
    throw new Error("Something went wrong!");
  },
  
  error(error) {
    return Response.json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
});
```

---

### Environment-Based Error Handling

```typescript
const isDevelopment = Bun.env.NODE_ENV === "development";

Bun.serve({
  development: isDevelopment,
  
  fetch(req) {
    throw new Error("Error occurred!");
  },
  
  error(error) {
    // In development, show detailed errors
    if (isDevelopment) {
      return new Response(
        `<pre>${error.message}\n\n${error.stack}</pre>`,
        {
          headers: { "Content-Type": "text/html" },
          status: 500,
        }
      );
    }
    
    // In production, show generic error
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  },
});
```

---

### Error Logging with Custom Handler

```typescript
Bun.serve({
  fetch(req) {
    throw new Error("Database connection failed");
  },
  
  error(error) {
    // Log error to external service
    console.error("Server error:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: error.request?.url,
    });
    
    // Send to error tracking service (e.g., Sentry)
    // trackError(error);
    
    // Return user-friendly error
    return Response.json({
      error: "An error occurred. Please try again later.",
      errorId: crypto.randomUUID(), // For support reference
    }, {
      status: 500,
    });
  },
});
```

---

### Type-Safe Error Handling

```typescript
interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

Bun.serve({
  fetch(req) {
    const error: AppError = new Error("Not found");
    error.statusCode = 404;
    error.code = "NOT_FOUND";
    throw error;
  },
  
  error(error: unknown) {
    const appError = error as AppError;
    
    // Handle different error types
    if (appError.statusCode) {
      return Response.json({
        error: appError.message,
        code: appError.code,
      }, {
        status: appError.statusCode,
      });
    }
    
    // Default 500 error
    return Response.json({
      error: "Internal server error",
    }, {
      status: 500,
    });
  },
});
```

---

### Error Handler with Request Context

```typescript
Bun.serve({
  fetch(req) {
    throw new Error("Processing failed");
  },
  
  error(error, request) {
    const url = new URL(request.url);
    
    // Different error pages for different routes
    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        error: error.message,
        path: url.pathname,
        method: request.method,
      }, {
        status: 500,
      });
    }
    
    // HTML error page for web routes
    return new Response(
      `<html>
        <body>
          <h1>Error</h1>
          <p>${error.message}</p>
          <a href="/">Go home</a>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
        status: 500,
      }
    );
  },
});
```

---

## Development Mode Configuration

### Full Development Mode Setup

```typescript
Bun.serve({
  port: 3000,
  
  development: {
    hmr: true,        // Hot module reloading
    console: true,    // Echo browser console logs to terminal
  },
  
  fetch(req) {
    throw new Error("Development error");
  },
  
  error(error) {
    // Custom error handler (optional in dev mode)
    console.error("Error:", error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  },
});
```

---

## Error Handling Best Practices

### 1. Always Implement Error Handlers

```typescript
Bun.serve({
  fetch(req) {
    // Your route handlers
  },
  
  error(error) {
    // Always implement error handler
    return Response.json({ error: "Internal error" }, { status: 500 });
  },
});
```

### 2. Log Errors Before Responding

```typescript
error(error) {
  // Log first
  console.error("Server error:", error);
  
  // Then respond
  return Response.json({ error: "Error occurred" }, { status: 500 });
}
```

### 3. Different Responses for Different Error Types

```typescript
error(error) {
  if (error instanceof TypeError) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  
  if (error instanceof Error && error.message.includes("not found")) {
    return Response.json({ error: "Resource not found" }, { status: 404 });
  }
  
  return Response.json({ error: "Server error" }, { status: 500 });
}
```

### 4. Hide Sensitive Information in Production

```typescript
error(error) {
  const isDev = Bun.env.NODE_ENV === "development";
  
  return Response.json({
    error: isDev ? error.message : "Internal server error",
    ...(isDev && { stack: error.stack }),
  }, {
    status: 500,
  });
}
```

### 5. Include Request ID for Tracking

```typescript
error(error, request) {
  const requestId = crypto.randomUUID();
  
  console.error(`[${requestId}] Error:`, error);
  
  return Response.json({
    error: "An error occurred",
    requestId, // Include in response for support
  }, {
    status: 500,
  });
}
```

---

## Integration Examples

### REST API with Error Handling

```typescript
Bun.serve({
  routes: {
    "/api/users/:id": async (req) => {
      const { id } = req.params;
      
      if (!id) {
        throw new Error("User ID required");
      }
      
      const user = await getUserById(id);
      if (!user) {
        throw new Error("User not found");
      }
      
      return Response.json(user);
    },
  },
  
  error(error) {
    // Handle route errors
    if (error.message === "User not found") {
      return Response.json({ error: error.message }, { status: 404 });
    }
    
    return Response.json({ error: "Server error" }, { status: 500 });
  },
});
```

---

### WebSocket Error Handling

```typescript
Bun.serve({
  websocket: {
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString());
        // Process message
      } catch (error) {
        ws.send(JSON.stringify({
          error: "Invalid message format",
          details: error.message,
        }));
      }
    },
    
    error(ws, error) {
      console.error("WebSocket error:", error);
      ws.close(1011, "Internal error");
    },
  },
  
  fetch(req) {
    throw new Error("HTTP error");
  },
  
  error(error) {
    // Handle HTTP errors
    return Response.json({ error: error.message }, { status: 500 });
  },
});
```

---

## Error Handler Signature

### TypeScript Types

```typescript
interface ServeOptions {
  // ... other options
  
  error?: (
    error: Error,
    request: Request
  ) => Response | Promise<Response>;
  
  development?: boolean | {
    hmr?: boolean;
    console?: boolean;
  };
}
```

---

## Common Error Scenarios

### 1. Unhandled Promise Rejections

```typescript
Bun.serve({
  fetch(req) {
    // This will be caught by error handler
    return fetch("https://api.example.com/data")
      .then(res => res.json())
      .then(data => Response.json(data));
  },
  
  error(error) {
    // Catches fetch errors, JSON parsing errors, etc.
    return Response.json({ error: "Request failed" }, { status: 500 });
  },
});
```

### 2. Route Handler Errors

```typescript
Bun.serve({
  routes: {
    "/api/data": async () => {
      throw new Error("Database error");
    },
  },
  
  error(error) {
    return Response.json({ error: error.message }, { status: 500 });
  },
});
```

### 3. Async Operation Errors

```typescript
Bun.serve({
  fetch(req) {
    return (async () => {
      await someAsyncOperation();
      throw new Error("Async error");
    })();
  },
  
  error(error) {
    return Response.json({ error: error.message }, { status: 500 });
  },
});
```

---

## Related Documentation

- [Bun Server API](https://bun.com/docs/runtime/http/server)
- [Development Mode](./BUN_FEATURES_IMPLEMENTATION_GUIDE.md#development-mode)
- [Server Lifecycle Methods](./BUN_SERVER_LIFECYCLE.md)
- [Debugging in Bun](https://bun.com/docs/runtime/debugger)

---

**Last Updated**: 2025-11-14  
**Status**: ✅ Documented  
**Reference**: [Bun Error Handling](https://bun.com/docs/runtime/http/server#error-handling)

