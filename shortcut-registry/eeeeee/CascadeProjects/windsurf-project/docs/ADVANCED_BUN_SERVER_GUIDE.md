# 🚀 Advanced Bun Server Features Complete Guide

## 📋 Table of Contents

- [Abstract Namespace Sockets (Linux Only)](#-abstract-namespace-sockets-linux-only)
- [Unix Domain Sockets (Cross-Platform)](#-unix-domain-sockets-cross-platform)
- [Export Default Syntax](#-export-default-syntax)
- [Hot Route Reloading](#-hot-route-reloading)
- [Idle Timeout Configuration](#idle-timeout-configuration)
- [Complete Examples](#-complete-examples)

## 🔌 Abstract Namespace Sockets (Linux Only)

### What are Abstract Namespace Sockets?

Abstract namespace sockets are a Linux-specific feature that provide:
- **No filesystem footprint** - No socket file created
- **Automatic cleanup** - Removed when last reference closes
- **High performance** - Faster than regular Unix sockets
- **Security** - Only accessible within the same namespace

### Syntax

```typescript
// Abstract namespace socket (Linux only)
export default {
  unix: '\0my-abstract-socket', // \0 prefix indicates abstract namespace
  fetch(req) {
    return new Response('Abstract socket response');
  }
} satisfies Serve.Options<undefined>;
```

### Usage Example

```bash
# Linux only
bun run abstract-hot-reload.ts

# Test with curl
curl --unix-socket @my-abstract-socket http://localhost/api/version
```

## 📁 Unix Domain Sockets (Cross-Platform)

### What are Unix Domain Sockets?

Unix domain sockets provide:
- **Inter-process communication** without network overhead
- **Filesystem-based** - Socket file created on disk
- **Security** - File permissions control access
- **Performance** - Faster than TCP sockets

### Syntax

```typescript
// Regular Unix socket (cross-platform)
export default {
  unix: '/tmp/my-socket.sock',
  fetch(req) {
    return new Response('Unix socket response');
  }
} satisfies Serve.Options<undefined>;
```

### Usage Example

```bash
# Cross-platform
bun run mac-hot-reload-demo.ts

# Test with curl
curl --unix-socket /tmp/hot-reload-demo.sock http://localhost/api/version
```

## 📤 Export Default Syntax

### What is Export Default Syntax?

Bun supports an alternative to `Bun.serve()` using ES modules:

```typescript
// Traditional approach
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello');
  }
});

// Export default approach
export default {
  port: 3000,
  fetch(req) {
    return new Response('Hello');
  }
} satisfies Serve.Options<undefined>;
```

### Benefits

- **Cleaner syntax** - Less boilerplate
- **Module compatibility** - Works with ES module systems
- **Type safety** - Better TypeScript integration
- **Framework friendly** - Easier integration with build tools

### Type Safety

```typescript
import type { Serve } from 'bun';

export default {
  unix: '\0my-socket',
  idleTimeout: 10,
  fetch(req, server) {
    return new Response('Typed response');
  }
} satisfies Serve.Options<undefined>;
```

## 🔄 Hot Route Reloading

### What is Hot Route Reloading?

Hot route reloading allows you to update server handlers without restarting:

```typescript
export default {
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === '/reload') {
      // Hot reload routes without server restart
      server.reload({
        routes: {
          '/api/v2': () => Response.json({ version: '2.0' }),
        },
        fetch(req) {
          return new Response('Updated handler');
        }
      });
      
      return new Response('Routes reloaded');
    }
    
    return new Response('Original handler');
  }
} satisfies Serve.Options<undefined>;
```

### Use Cases

- **Zero-downtime updates** - Update logic without restart
- **Feature flags** - Enable/disable features dynamically
- **A/B testing** - Switch between implementations
- **Emergency patches** - Quick fixes without deployment

### Limitations

- Only `fetch`, `error`, and `routes` can be updated
- WebSocket handlers cannot be reloaded
- Server configuration (port, unix socket) cannot be changed

## Idle Timeout Configuration

### What is Idle Timeout?

Idle timeout automatically closes connections that are inactive:

```typescript
export default {
  unix: '\0my-socket',
  idleTimeout: 10, // 10 seconds
  fetch(req) {
    return new Response('Response');
  }
} satisfies Serve.Options<undefined>;
```

### Behavior

- **Connection monitoring** - Tracks data sent/received
- **Automatic cleanup** - Closes idle connections
- **Resource management** - Prevents connection leaks
- **Performance** - Frees up system resources

### Per-Request Timeouts

You can also set timeouts for individual requests:

```typescript
fetch(req, server) {
  // Set 60-second timeout for this specific request
  server.timeout(req, 60);
  
  // Long-running operation
  await longOperation();
  
  return new Response('Complete');
}
```

## 🎯 Complete Examples

### Example 1: Abstract Socket with Hot Reload (Linux)

```typescript
import type { Serve } from 'bun';

let version = '1.0.0';

export default {
  unix: '\0my-service',
  idleTimeout: 15,
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === '/reload') {
      version = '2.0.0';
      server.reload({
        routes: {
          '/version': () => Response.json({ version }),
        }
      });
      return Response.json({ reloaded: true, version });
    }
    
    return Response.json({ version });
  },
  routes: {
    '/version': () => Response.json({ version }),
  }
} satisfies Serve.Options<undefined>;
```

### Example 2: Unix Socket with Routes (Cross-platform)

```typescript
import type { Serve } from 'bun';

export default {
  unix: '/tmp/api.sock',
  idleTimeout: 30,
  routes: {
    '/health': () => Response.json({ status: 'healthy' }),
    '/metrics': () => Response.json({
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }),
  },
  fetch(req) {
    return new Response('API endpoint not found', { status: 404 });
  }
} satisfies Serve.Options<undefined>;
```

### Example 3: Advanced Hot Reload with State

```typescript
import type { Serve } from 'bun';

let config = {
  maintenance: false,
  version: '1.0.0'
};

export default {
  port: 3000,
  idleTimeout: 20,
  fetch(req, server) {
    const url = new URL(req.url);
    
    if (url.pathname === '/admin/reload') {
      // Update configuration
      config = { ...config, version: '1.1.0' };
      
      // Reload with new handlers
      server.reload({
        fetch(req, server) {
          const url = new URL(req.url);
          
          if (config.maintenance) {
            return new Response('Service under maintenance', { status: 503 });
          }
          
          return Response.json({ 
            version: config.version,
            timestamp: new Date().toISOString()
          });
        }
      });
      
      return Response.json({ reloaded: true, config });
    }
    
    return Response.json({ version: config.version });
  }
} satisfies Serve.Options<undefined>;
```

## 🧪 Testing Commands

### Abstract Socket (Linux)
```bash
# Start server
bun run abstract-hot-reload.ts

# Test endpoints
curl --unix-socket @my-abstract-socket http://localhost/api/version
curl --unix-socket @my-abstract-socket http://localhost/reload
curl --unix-socket @my-abstract-socket http://localhost/api/version
```

### Unix Socket (Cross-platform)
```bash
# Start server
bun run mac-hot-reload-demo.ts

# Test endpoints
curl --unix-socket /tmp/hot-reload-demo.sock http://localhost/api/version
curl --unix-socket /tmp/hot-reload-demo.sock http://localhost/reload
curl --unix-socket /tmp/hot-reload-demo.sock http://localhost/api/version
```

### Performance Testing
```bash
# Benchmark Unix socket vs TCP
ab -n 1000 -c 10 -k http://localhost:3000/api/version
ab -n 1000 -c 10 --unix-socket /tmp/api.sock http://localhost/api/version
```

## 🔧 Best Practices

### 1. Socket Management
```typescript
// Clean up socket files on startup
const socketPath = '/tmp/my-app.sock';
try {
  await Bun.file(socketPath).delete();
} catch {
  // Socket doesn't exist, continue
}

export default {
  unix: socketPath,
  fetch(req) {
    return new Response('Hello');
  }
} satisfies Serve.Options<undefined>;
```

### 2. Error Handling
```typescript
export default {
  unix: '\0my-socket',
  idleTimeout: 10,
  fetch(req) {
    try {
      return new Response('Success');
    } catch (error) {
      return new Response('Internal error', { status: 500 });
    }
  },
  error(error) {
    console.error('Server error:', error);
    return new Response('Server error', { status: 500 });
  }
} satisfies Serve.Options<undefined>;
```

### 3. Type Safety
```typescript
import type { Serve } from 'bun';

interface Config {
  version: string;
  maintenance: boolean;
}

const config: Config = {
  version: '1.0.0',
  maintenance: false
};

export default {
  unix: '\0my-app',
  fetch(req, server): Response | Promise<Response> {
    return Response.json(config);
  }
} satisfies Serve.Options<undefined>;
```

## 📊 Performance Comparison

| Socket Type | Latency | Throughput | Filesystem | Cleanup |
|-------------|---------|------------|------------|---------|
| Abstract (Linux) | ~0.1ms | Highest | No | Automatic |
| Unix Domain | ~0.2ms | High | Yes | Manual |
| TCP (localhost) | ~0.5ms | Medium | No | N/A |

## 🎯 Use Cases

### Microservices
- **Service discovery** - Abstract sockets for internal communication
- **Load balancing** - Multiple processes sharing same socket
- **Health checks** - Unix sockets for monitoring

### Development
- **Hot reloading** - Update code without restart
- **Feature flags** - Dynamic configuration changes
- **A/B testing** - Switch implementations

### Production
- **Zero downtime** - Seamless updates
- **Resource management** - Idle timeout prevents leaks
- **Security** - Filesystem permissions control access

---

**🚀 Master these advanced Bun server features for high-performance, production-ready applications!**
