# 🎯 Bun.serve() Development Configuration - Complete Reference Guide

## 📋 **Overview**

Bun.serve() provides advanced development configuration options that enable Hot Module Reloading (HMR), console log forwarding, and production optimization features.

---

## 🔧 **Basic Development Setup**

### **Development Mode with HMR and Console Logging**
```typescript
import homepage from "./index.html";

Bun.serve({
  development: {
    // Enable Hot Module Reloading
    hmr: true,

    // Echo console logs from the browser to the terminal
    console: true,
  },

  routes: {
    "/": homepage,
  },

  port: 3000,
});
```

### **Production Mode**
```typescript
import homepage from "./index.html";

Bun.serve({
  development: false,  // Production mode

  routes: {
    "/": homepage,
  },

  port: 3000,
});
```

---

## 📊 **Development vs Production Features**

| Feature | Development | Production |
|---------|-------------|------------|
| **Source maps** | ✅ Enabled | ❌ Disabled |
| **Minification** | ❌ Disabled | ✅ Enabled |
| **Hot reloading** | ✅ Enabled | ❌ Disabled |
| **Asset bundling** | 🔄 On each request | 💾 Cached |
| **Console logging** | 🖥️ Browser → Terminal | ❌ Disabled |
| **Error details** | 📝 Detailed | 🔒 Minimal |
| **Cache headers** | ❌ Disabled | ✅ Enabled |
| **Performance** | 🐢 Slower | 🚀 Faster |

---

## 🔄 **Hot Module Reloading (HMR)**

### **Enable HMR**
```typescript
Bun.serve({
  development: {
    hmr: true,  // Enable Hot Module Reloading
  },
  routes: { "/": homepage },
});
```

### **HMR Features**
✅ **Automatic Reloads** - Browser reloads on file changes
✅ **State Preservation** - Maintains application state during reloads
✅ **Multi-format Support** - Works with TypeScript, JavaScript, CSS, HTML
✅ **WebSocket Connection** - Uses WebSocket for live updates
✅ **Fast Refresh** - Near-instant updates without full page reload

### **HMR Workflow**
1. **File Change** - Detect changes in source files
2. **WebSocket Notification** - Send update to browser
3. **Module Replacement** - Replace changed modules
4. **State Preservation** - Maintain application state
5. **UI Update** - Refresh only changed components

---

## 🖥️ **Console Log Forwarding**

### **Enable Console Forwarding**
```typescript
Bun.serve({
  development: {
    console: true,  // Forward browser console to terminal
  },
  routes: { "/": homepage },
});
```

### **Console Forwarding Features**
✅ **All Console Methods** - log, info, warn, error, debug, trace
✅ **Object Support** - Forwards objects, arrays, and complex data
✅ **Error Handling** - Maintains stack traces and error details
✅ **Formatting** - Preserves console formatting and styling
✅ **WebSocket Integration** - Uses existing HMR WebSocket connection

### **Browser Console Methods Supported**
```javascript
// All these methods are forwarded to terminal
console.log("Basic log message");
console.info("Information message");
console.warn("Warning message");
console.error("Error message");
console.debug("Debug message");
console.trace("Stack trace");

// Complex data types
console.log("Object:", { name: "Alice", age: 30 });
console.log("Array:", [1, 2, 3, 4, 5]);
console.log("Error:", new Error("Test error"));

// Performance timing
console.time("Timer");
// ... code to measure
console.timeEnd("Timer");
```

---

## 📦 **Asset Bundling**

### **Development Asset Bundling**
```typescript
Bun.serve({
  development: true,  // Development mode

  routes: {
    "/": homepage,  // Bundled on each request
  },
});
```

**Development Bundling Features:**
- 🔄 **On-demand bundling** - Assets bundled per request
- ❌ **No caching** - Always fresh for development
- ✅ **Source maps** - Enabled for debugging
- 🔍 **Detailed errors** - Full stack traces and source references

### **Production Asset Bundling**
```typescript
Bun.serve({
  development: false,  // Production mode

  routes: {
    "/": homepage,  // Bundled once and cached
  },
});
```

**Production Bundling Features:**
- 💾 **In-memory caching** - Bundle once, cache in memory
- ✅ **Cache headers** - Cache-Control and ETag headers
- 🗜️ **Minification** - JavaScript/TypeScript/TSX/JSX minification
- ⚡ **Performance** - Optimized for production serving

---

## 🏗️ **Ahead-of-Time Bundling**

### **Build Command**
```bash
bun build --target=bun --production --outdir=dist ./src/index.ts
```

### **Runtime Bundling with Build Artifacts**
```typescript
import { serve } from "bun";
import index from "./index.html";  // Pre-built HTML import

serve({
  routes: { "/": index },
  port: 3000,
});
```

**AOT Bundling Benefits:**
- 🚀 **Faster Startup** - No runtime bundling needed
- 💾 **Static Assets** - Pre-built and optimized
- 🔒 **Production Ready** - Optimized for production
- 📦 **Manifest Generation** - Automatic asset manifest

---

## 🔧 **Advanced Configuration**

### **Mixed Development Configuration**
```typescript
Bun.serve({
  development: {
    hmr: false,     // Disable HMR
    console: true,  // Keep console logging
  },
  routes: { "/": homepage },
});
```

### **Environment-Based Configuration**
```typescript
const isDevelopment = process.env.NODE_ENV !== "production";
const isProduction = process.env.NODE_ENV === "production";

Bun.serve({
  development: isDevelopment,
  routes: { "/": homepage },
  port: 3000,
});
```

### **Advanced Development Setup**
```typescript
Bun.serve({
  development: {
    hmr: true,
    console: true,
  },

  routes: {
    "/": new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Advanced Dev Server</title>
      </head>
      <body>
        <h1>Development Server</h1>
        <script>
          console.log('🚀 Page loaded');
          console.log('📊 Performance:', performance.now());

          // Test different console methods
          console.info('ℹ️ Info message');
          console.warn('⚠️ Warning message');
          console.error('❌ Error message');

          // Test object logging
          const user = { name: 'Alice', age: 30 };
          console.log('👤 User data:', user);
        </script>
      </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    }),
  },

  port: 3000,
});
```

---

## 🎯 **Real-World Examples**

### **API Development Server**
```typescript
Bun.serve({
  development: {
    hmr: true,
    console: true,
  },

  routes: {
    "/": new Response(`
      <h1>API Development Server</h1>
      <div id="app"></div>
      <script>
        // Test API calls with console logging
        fetch('/api/users')
          .then(response => response.json())
          .then(users => {
            console.log('👥 Users loaded:', users);
            renderUsers(users);
          })
          .catch(error => {
            console.error('❌ API Error:', error);
          });
      </script>
    `, {
      headers: { "Content-Type": "text/html" }
    }),

    "/api/users": new Response(JSON.stringify([
      { id: 1, name: "Alice", role: "developer" },
      { id: 2, name: "Bob", role: "designer" },
      { id: 3, name: "Charlie", role: "manager" }
    ]), {
      headers: { "Content-Type": "application/json" }
    }),
  },

  port: 3000,
});
```

### **Full-Stack Application**
```typescript
import homepage from "./index.html";
import styles from "./styles.css";

Bun.serve({
  development: {
    hmr: true,
    console: true,
  },

  routes: {
    "/": homepage,
    "/styles.css": styles,

    "/api/*": new Response("API endpoint", {
      status: 404,
      headers: { "Content-Type": "text/plain" }
    }),
  },

  port: 3000,
});
```

---

## 🚀 **Performance Optimization**

### **Development Performance**
```typescript
// Optimized for development speed
Bun.serve({
  development: {
    hmr: true,
    console: true,
  },

  // Development-specific optimizations
  fetch(req) {
    // Add development headers
    return new Response("Development response", {
      headers: {
        "Cache-Control": "no-cache",
        "X-Development-Mode": "true"
      }
    });
  },
});
```

### **Production Performance**
```typescript
// Optimized for production performance
Bun.serve({
  development: false,  // Production mode

  fetch(req) {
    // Production optimizations
    return new Response("Production response", {
      headers: {
        "Cache-Control": "public, max-age=31536000",
        "X-Production-Mode": "true"
      }
    });
  },
});
```

---

## 🛠️ **Debugging and Monitoring**

### **Development Debugging**
```typescript
Bun.serve({
  development: {
    hmr: true,
    console: true,
  },

  fetch(req) {
    // Development debugging
    console.log(`📝 ${req.method} ${req.url}`);
    console.log(`🔍 Headers:`, Object.fromEntries(req.headers.entries()));

    return new Response("Debug info logged");
  },
});
```

### **Production Monitoring**
```typescript
Bun.serve({
  development: false,  // Production mode

  fetch(req) {
    // Production monitoring
    const start = performance.now();

    // Handle request...
    const response = new Response("Production response");

    const duration = performance.now() - start;
    console.log(`⚡ ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);

    return response;
  },
});
```

---

## 🎯 **Best Practices**

### ✅ **Development Best Practices**
- **Enable HMR** for rapid iteration
- **Use console forwarding** for debugging
- **Keep development mode** for dev environment
- **Use source maps** for debugging
- **Monitor console output** for browser issues
- **Test in development** before production

### ✅ **Production Best Practices**
- **Set development: false** for production
- **Enable caching headers** for performance
- **Use minified assets** for faster loading
- **Disable console forwarding** for security
- **Monitor performance metrics**
- **Use AOT bundling** for optimal performance

### ❌ **Common Pitfalls**
- **Forgetting to disable** development mode in production
- **Leaking console logs** in production builds
- **Not using caching** in production
- **Missing error handling** in production
- **Ignoring performance** optimization

---

## 🏆 **Summary**

**Bun.serve() Development Configuration Features:**

✅ **Hot Module Reloading** - Automatic browser updates on file changes
✅ **Console Forwarding** - Browser console logs appear in terminal
✅ **Development vs Production** - Optimized modes for different environments
✅ **Asset Bundling** - On-demand vs cached bundling strategies
✅ **Source Maps** - Development debugging support
✅ **Minification** - Production optimization
✅ **Performance Optimization** - Environment-specific optimizations
✅ **Error Handling** - Detailed vs minimal error reporting
✅ **Caching** - Development vs production caching strategies
✅ **AOT Bundling** - Pre-build optimization for production

**Key Configuration Options:**
- `development: true` - Enable development features
- `development: false` - Enable production optimization
- `development: { hmr: true }` - Enable Hot Module Reloading
- `development: { console: true }` - Enable console forwarding

**Choose the right configuration based on your environment and development needs!** 🚀
