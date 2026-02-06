# 🎯 Bun Processing Pipeline - Complete Reference Guide

## 📋 **Overview**

Bun provides an automatic 5-step processing pipeline for HTML files that handles TypeScript, JSX, CSS, assets, and optimization. This enables seamless full-stack development with minimal configuration.

---

## 🔧 **Processing Pipeline Steps**

### **Step 1: `<script>` Processing**
Transpiles TypeScript, JSX, and TSX in `<script>` tags

**Input:**
```html
<script type="module" src="./counter.tsx"></script>
```

**Processing:**
- ✅ Transpiles TypeScript to JavaScript
- ✅ Converts JSX to React.createElement calls
- ✅ Bundles imported dependencies
- ✅ Generates sourcemaps for debugging
- ✅ Minifies when `development` is not true

**Output:**
```html
<script type="module" src="/assets/counter-a1b2c3d4.js"></script>
```

---

### **Step 2: `<link>` Processing**
Processes CSS imports and `<link>` tags

**Input:**
```html
<link rel="stylesheet" href="./styles.css" />
```

**Processing:**
- ✅ Processes CSS imports and `@import` statements
- ✅ Concatenates multiple CSS files
- ✅ Rewrites `url()` and asset paths with content-addressable hashes
- ✅ Inlines small assets as `data:` URLs

**Output:**
```html
<link rel="stylesheet" href="/assets/styles-e5f6g7h8.css" />
```

---

### **Step 3: Asset Processing**
Links to assets are rewritten to include content-addressable hashes

**Input:**
```html
<img src="./logo.png" alt="Logo" />
```

**Processing:**
- ✅ Rewrites asset URLs with content-addressable hashes
- ✅ Inlines small assets in CSS files as `data:` URLs
- ✅ Reduces total number of HTTP requests
- ✅ Optimizes for browser caching

**Output:**
```html
<img src="/assets/logo-i9j0k1l2.png" alt="Logo" />
```

---

### **Step 4: HTML Rewriting**
Combines all tags into single optimized tags

**Input:**
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./styles.css" />
  <link rel="stylesheet" href="./components.css" />
</head>
<body>
  <script type="module" src="./app.tsx"></script>
  <script type="module" src="./utils.ts"></script>
</body>
</html>
```

**Output:**
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/assets/bundle-m3n4o5p6.css" />
</head>
<body>
  <script type="module" src="/assets/bundle-q7r8s9t0.js"></script>
</body>
</html>
```

---

### **Step 5: Serving**
All output files are exposed as static routes

**Processing:**
- ✅ Uses same mechanism as `static` in `Bun.serve()`
- ✅ Works similarly to `Bun.build` HTML processing
- ✅ Automatic route generation
- ✅ Optimized for production serving

---

## 🏗️ **Complete Fullstack Example**

### **Server Configuration**
```typescript
import { serve } from "bun";
import { Database } from "bun:sqlite";
import homepage from "./public/index.html";
import dashboard from "./public/dashboard.html";

// Initialize database
const db = new Database("app.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const server = serve({
  routes: {
    // Frontend routes
    "/": homepage,
    "/dashboard": dashboard,

    // API routes
    "/api/users": {
      async GET() {
        const users = db.query("SELECT * FROM users").all();
        return Response.json(users);
      },

      async POST(req) {
        const { name, email } = await req.json();

        try {
          const result = db.query("INSERT INTO users (name, email) VALUES (?, ?) RETURNING *").get(name, email);
          return Response.json(result, { status: 201 });
        } catch (error) {
          return Response.json({ error: "Email already exists" }, { status: 400 });
        }
      },
    },

    "/api/users/:id": {
      async GET(req) {
        const { id } = req.params;
        const user = db.query("SELECT * FROM users WHERE id = ?").get(id);

        if (!user) {
          return Response.json({ error: "User not found" }, { status: 404 });
        }

        return Response.json(user);
      },

      async DELETE(req) {
        const { id } = req.params;
        const result = db.query("DELETE FROM users WHERE id = ?").run(id);

        if (result.changes === 0) {
          return Response.json({ error: "User not found" }, { status: 404 });
        }

        return new Response(null, { status: 204 });
      },
    },

    // Health check endpoint
    "/api/health": {
      GET() {
        return Response.json({
          status: "ok",
          timestamp: new Date().toISOString(),
        });
      },
    },
  },

  // Enable development mode
  development: {
    hmr: true,
    console: true,
  },

  // Fallback for unmatched routes
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Server running on ${server.url}`);
```

### **Frontend HTML**
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Fullstack Bun App</title>
    <link rel="stylesheet" href="../src/styles.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="../src/main.tsx"></script>
  </body>
</html>
```

### **React Components**
```typescript
// src/main.tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

const container = document.getElementById("root")!;
const root = createRoot(container);
root.render(<App />);

// src/App.tsx
import { useState, useEffect } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    const response = await fetch("/api/users");
    const data = await response.json();
    setUsers(data);
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      if (response.ok) {
        setName("");
        setEmail("");
        await fetchUsers();
      } else {
        const error = await response.json();
        alert(error.error);
      }
    } catch (error) {
      alert("Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="container">
      <h1>User Management</h1>
      <form onSubmit={createUser} className="form">
        <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create User"}
        </button>
      </form>
      <div className="users">
        <h2>Users ({users.length})</h2>
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div>
              <strong>{user.name}</strong>
              <br />
              <span>{user.email}</span>
            </div>
            <button onClick={() => deleteUser(user.id)} className="delete-btn">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📁 **Project Structure**

### **Recommended Structure**
```text
my-app/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   └── UserList.tsx
│   ├── styles/
│   │   ├── globals.css
│   │   └── components.css
│   ├── utils/
│   │   └── api.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
│   ├── index.html
│   ├── dashboard.html
│   └── favicon.ico
├── server/
│   ├── routes/
│   │   ├── users.ts
│   │   └── auth.ts
│   ├── db/
│   │   └── schema.sql
│   └── index.ts
├── bunfig.toml
└── package.json
```

---

## ⚙️ **Environment Configuration**

### **Development Configuration**
```typescript
// server/config.ts
export const config = {
  development: process.env.NODE_ENV !== "production",
  port: process.env.PORT || 3000,
  database: {
    url: process.env.DATABASE_URL || "./dev.db",
  },
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
  },
};
```

### **Environment Variables**
```bash
# .env.development
NODE_ENV=development
PORT=3000
DATABASE_URL=./dev.db
CORS_ORIGIN=*

# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
CORS_ORIGIN=https://myapp.com
```

---

## ❌ **Error Handling**

### **Development Error Handling**
```typescript
// server/middleware.ts
export function errorHandler(error: Error, req: Request) {
  console.error("Server error:", error);

  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  return Response.json(
    {
      error: error.message,
      stack: error.stack,
    },
    { status: 500 },
  );
}
```

**Development Features:**
- ✅ Full stack traces
- ✅ Detailed error messages
- ✅ Source file references
- ✅ Interactive error pages

**Production Features:**
- ✅ Minimal error details
- ✅ Generic error messages
- ✅ Secure error handling
- ✅ No source file exposure

---

## 🔧 **API Response Helpers**

### **Utility Functions**
```typescript
// server/utils.ts
export function json(data: any, status = 200) {
  return Response.json(data, { status });
}

export function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function notFound(message = "Not found") {
  return error(message, 404);
}

export function unauthorized(message = "Unauthorized") {
  return error(message, 401);
}
```

---

## 🔒 **Type Safety**

### **Type Definitions**
```typescript
// types/api.ts
export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
```

---

## 🚀 **Deployment**

### **Production Build**
```bash
# Build for production
bun build --target=bun --production --outdir=dist ./server/index.ts

# Run production server
NODE_ENV=production bun dist/index.js
```

### **Docker Deployment**
```dockerfile
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN bun build --target=bun --production --outdir=dist ./server/index.ts

# Production stage
FROM oven/bun:1-slim
WORKDIR /usr/src/app
COPY --from=base /usr/src/app/dist ./
COPY --from=base /usr/src/app/public ./public

EXPOSE 3000
CMD ["bun", "index.js"]
```

---

## 🔄 **Migration from Other Frameworks**

### **From Express + Webpack**
```typescript
// Before (Express + Webpack)
app.use(express.static("dist"));
app.get("/api/users", (req, res) => {
  res.json(users);
});

// After (Bun fullstack)
serve({
  routes: {
    "/": homepage, // Replaces express.static
    "/api/users": {
      GET() {
        return Response.json(users);
      },
    },
  },
});
```

### **From Next.js API Routes**
```typescript
// Before (Next.js)
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.json(users);
  }
}

// After (Bun)
"/api/users": {
  GET() { return Response.json(users); }
}
```

---

## ⚠️ **Current Limitations**

### **Known Limitations**
- ❌ `bun build` CLI integration not yet available for fullstack apps
- ❌ Auto-discovery of API routes not implemented
- ❌ Server-side rendering (SSR) not built-in
- ❌ Plugin ecosystem still developing

---

## 🔮 **Planned Features**

### **Upcoming Features**
- ✅ Integration with `bun build` CLI
- ✅ File-based routing for API endpoints
- ✅ Built-in SSR support
- ✅ Enhanced plugin ecosystem
- ✅ Advanced caching strategies
- ✅ Database integrations

---

## ⚡ **Performance Optimization**

### **Optimization Features**
- ✅ Content-addressable hashing for cache busting
- ✅ Asset inlining for small files
- ✅ CSS and JS minification in production
- ✅ HTTP/2 support
- ✅ Gzip compression
- ✅ Static asset caching

### **Development vs Production**
| Feature | Development | Production |
|---------|-------------|------------|
| **Source maps** | ✅ Enabled | ❌ Disabled |
| **Minification** | ❌ Disabled | ✅ Enabled |
| **Asset hashing** | ✅ Enabled | ✅ Enabled |
| **Caching** | ❌ Disabled | ✅ Enabled |
| **Error details** | ✅ Detailed | ❌ Minimal |

---

## 🎯 **Best Practices**

### ✅ **Development Best Practices**
- Use environment-based configuration
- Implement proper error handling
- Use TypeScript for type safety
- Organize project structure logically
- Use CSS modules or styled components
- Implement proper database schema
- Add health check endpoints
- Use CORS appropriately

### ✅ **Production Best Practices**
- Set `NODE_ENV=production`
- Enable proper caching headers
- Use minified assets
- Implement proper logging
- Use database connection pooling
- Add rate limiting
- Implement proper security headers
- Monitor performance metrics

---

## 🏆 **Summary**

**Bun Processing Pipeline Features:**

✅ **Automatic HTML Processing** - 5-step pipeline for HTML files
✅ **TypeScript/JSX Support** - Transpilation and bundling
✅ **CSS Processing** - Concatenation and optimization
✅ **Asset Optimization** - Hashing and inlining
✅ **Development vs Production** - Environment-specific optimization
✅ **Full-stack Support** - Server and client in one project
✅ **Type Safety** - TypeScript throughout
✅ **Database Integration** - Built-in SQLite support
✅ **API Routes** - Simple route handlers
✅ **Error Handling** - Environment-appropriate error reporting
✅ **Deployment Ready** - Docker and production builds
✅ **Migration Friendly** - Easy transition from other frameworks

**The processing pipeline provides a complete full-stack development experience with automatic optimization and minimal configuration!** 🚀
