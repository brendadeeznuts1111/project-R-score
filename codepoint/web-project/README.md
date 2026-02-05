# 🚀 Bun Proxy API - Complete Properties Reference

A comprehensive, production-ready WebSocket proxy server built with Bun, featuring extensive configuration options, load balancing, security, monitoring, and more.

## ✨ Features

- 🔄 **WebSocket Proxying** - High-performance bidirectional WebSocket proxy
- ⚖️ **Load Balancing** - Multiple strategies (round-robin, least-connections, weighted, IP-hash)
- 🔐 **Security** - TLS, authentication, rate limiting, firewall rules
- 📊 **Monitoring** - Health checks, statistics collection, metrics export
- 🚀 **Performance** - Connection pooling, compression, caching
- 📝 **Logging** - Structured logging with multiple transports
- 🏗️ **Clustering** - Multi-process support for scalability
- 🛡️ **Reliability** - Circuit breakers, graceful shutdown, reconnection logic

## 📦 Installation

```bash
bun install
```

### 🔧 Bun Configuration

This project uses Bun's isolated installs feature for better dependency management. Copy `.bunfig.toml.example` to `bunfig.toml` and configure your settings:

```bash
cp .bunfig.toml.example bunfig.toml
```

**Automated Setup:**

Run the setup script for automatic configuration:

```bash
./setup-isolated-installs.sh
```

This script will:

- Copy the example configuration to `bunfig.toml`
- Detect your OS and suggest optimal backend settings
- Handle migration from hoisted to isolated installs
- Show isolated store structure

#### 🚀 Isolated Installs

Isolated installs provide strict dependency isolation similar to pnpm, offering:

- **🔒 Strict Dependency Isolation** - Each package has its own dependencies
- **⚡ Better Performance** - Deduplication and faster installs
- **💾 Disk Efficiency** - Central package store with symlinks
- **🛡️ Reliability** - Prevents phantom dependencies

**Configuration:**

```toml
# bunfig.toml
configVersion = 1  # Enables isolated installs by default

[install]
linker = "isolated"  # Explicit isolated installs
registry = { url = "https://registry.your-org.com", token = "$NPM_AUTH_TOKEN" }
```

**Directory Structure:**

```text
node_modules/
├── .bun/                    # Central package store
│   ├── package@1.0.0/       # Versioned installations
│   └── @your-org/            # Scoped packages
└── package-name -> .bun/package@1.0.0/node_modules/package  # Symlinks
```

## 🚀 Quick Start

### Basic WebSocket Proxy

```typescript
import { ProxyServerConfig, BunProxyServer } from './index';

const config = new ProxyServerConfig({
  targetUrl: 'ws://localhost:8080/ws',
  listenPort: 3000,
  debug: true,
});

const server = new BunProxyServer(config);
await server.start();
console.log('🚀 Proxy running on ws://localhost:3000');
```

### Using the Configuration Builder

```typescript
import { createProxyConfig, BunProxyServer } from './index';

const config = createProxyConfig()
  .target('ws://localhost:8080/ws')
  .port(3000)
  .maxConnections(1000)
  .debug(true)
  .build();

const server = new BunProxyServer(config);
await server.start();
```

## 📋 Configuration Reference

### Core Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `targetUrl` | `string` | **Required** | Backend WebSocket URL to proxy to |
| `listenPort` | `number` | `0` | Port to listen on (0 = random available) |
| `listenHost` | `string` | `"0.0.0.0"` | Host address to bind |
| `maxConnections` | `number` | `10000` | Maximum concurrent connections |
| `idleTimeout` | `number` | `60000` | Idle connection timeout (ms) |
| `debug` | `boolean` | `false` | Enable debug logging |

### Security Configuration

```typescript
const config = new ProxyServerConfig({
  // TLS/SSL
  tls: {
    cert: Bun.file('./cert.pem'),
    key: Bun.file('./key.pem'),
    ca: Bun.file('./ca.pem'), // optional
  },

  // Authentication
  authentication: {
    type: 'bearer', // 'bearer' | 'basic' | 'api_key' | 'jwt'
    token: 'your-secret-token',
  },

  // Rate Limiting
  rateLimiting: {
    enabled: true,
    windowMs: 60000, // 1 minute
    maxRequests: 100,
  },
});
```

### Load Balancing

```typescript
const config = new ProxyServerConfig({
  loadBalancing: {
    strategy: 'round-robin', // 'round-robin' | 'least-connections' | 'weighted'
    targets: [
      { url: 'ws://backend1.example.com/ws', weight: 1 },
      { url: 'ws://backend2.example.com/ws', weight: 2 },
    ],
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      interval: 10000,
    },
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      resetTimeout: 30000,
    },
  },
});
```

### Performance & Caching

```typescript
const config = new ProxyServerConfig({
  // Compression
  compression: {
    enabled: true,
    algorithm: 'gzip',
    level: 6,
  },

  // Connection Pooling
  connectionPool: {
    enabled: true,
    minSize: 0,
    maxSize: 10,
  },

  // Caching
  caching: {
    enabled: true,
    type: 'memory',
    ttl: 300000, // 5 minutes
    maxSize: 1000,
  },
});
```

### Monitoring & Health Checks

```typescript
const config = new ProxyServerConfig({
  // Health Checks
  health: {
    enabled: true,
    endpoint: '/health',
    interval: 30000,
    timeout: 5000,
  },

  // Statistics
  stats: {
    collectionInterval: 5000,
    exportFormat: 'json', // 'json' | 'prometheus' | 'csv'
    exportPath: './stats',
  },

  // Metrics
  metrics: {
    enabled: true,
    endpoint: '/metrics',
    format: 'prometheus',
  },
});
```

### �️ Advanced Configuration

#### Isolated Installs Deep Dive

**Backend Strategies:**

Isolated installs automatically detect the best backend strategy for your system:

- **Clonefile (macOS)** - Copy-on-write filesystem clones for maximum efficiency
- **Hardlink (Linux/Windows)** - Hardlinks to save disk space
- **Copyfile (fallback)** - Full file copies when other methods aren't available

**Manual Backend Configuration:**

```toml
[install.isolated]
backend = "clonefile"  # or "hardlink", "copyfile", "auto"
verbose = true        # Enable debug logging
```

**Debugging Isolated Installs:**

```bash
# Run with verbose output to see installation details
bun install --linker isolated --verbose

# Check package resolution
bunx which package-name

# View isolated store contents
ls -la node_modules/.bun/
```

**Migration from npm/Yarn:**

```bash
# Start fresh with isolated installs
rm -rf node_modules package-lock.json
bun install --linker isolated

# Or update config version
echo "configVersion = 1" >> bunfig.toml
```

**Troubleshooting:**

| Issue | Solution |
|-------|----------|
| **Phantom dependencies** | Ensure `configVersion = 1` and `linker = "isolated"` |
| **Slow installs** | Check backend strategy with `--verbose` flag |
| **Disk space issues** | Use `backend = "hardlink"` or clear `.bun-cache` |
| **Permission errors** | Check file permissions for `node_modules/.bun` |
| **Hardcoded paths** | Use hoisted mode: `bun install --linker hoisted` |
| **Dynamic imports failing** | Check Node.js resolution compatibility |
| **Build tool issues** | Verify tool supports isolated node_modules |

**Compatibility Issues:**

Some packages may have compatibility issues with isolated installs:

- **Hardcoded paths** - Packages assuming flat `node_modules` structure
- **Dynamic imports** - Runtime imports not following Node.js resolution
- **Build tools** - Tools that scan `node_modules` directly

**Solutions:**

1. **Switch to hoisted mode** for specific projects:
   ```bash
   bun install --linker hoisted
   ```

2. **Report issues** to help improve isolated install support

3. **Use environment override** for problematic packages:
   ```bash
   BUN_LINKER=hoisted bun install
   ```

**Performance Considerations:**

- **Install time** - May be slightly slower due to symlink operations
- **Disk usage** - Similar to hoisted (uses symlinks, not file copies)
- **Memory usage** - Higher during install due to complex peer resolution

### Custom Logging

```typescript
const config = new ProxyServerConfig({
  logging: {
    level: 'info',
    format: 'json',
    destination: 'file',
    file: './logs/proxy.log',
    rotation: 'daily',
    maxSize: '100MB',
    maxFiles: 30,
  },
});
```

### Clustering

```typescript
const config = new ProxyServerConfig({
  cluster: {
    enabled: true,
    instances: 'auto', // or number
    strategy: 'round-robin',
  },
});
```

### Graceful Shutdown

```typescript
const config = new ProxyServerConfig({
  gracefulShutdown: {
    enabled: true,
    timeout: 30000,
    signals: ['SIGTERM', 'SIGINT'],
    drainConnections: true,
  },
});
```

## 📊 Monitoring Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600000,
  "activeConnections": 150,
  "maxConnections": 10000,
  "totalConnections": 5000,
  "memoryUsage": {
    "rss": 134217728,
    "heapTotal": 67108864,
    "heapUsed": 50331648
  }
}
```

### Statistics

```bash
GET /stats
```

Response:
```json
{
  "totalConnections": 5000,
  "activeConnections": 150,
  "totalMessages": 100000,
  "totalBytes": 1048576000,
  "averageLatency": 45.2,
  "errors": 5,
  "uptime": 3600000,
  "connections": [...]
}
```

### Metrics (Prometheus)

```bash
GET /metrics
```

Prometheus-formatted metrics for monitoring systems.

## 🛠️ API Reference

### ProxyServerConfig

Main configuration class with validation.

```typescript
const config = new ProxyServerConfig({
  targetUrl: 'ws://backend.example.com/ws',
  // ... other options
});
```

#### Methods

- `toObject()` - Get configuration as plain object
- `toJSON()` - Get configuration as JSON string
- `clone()` - Create a copy of the configuration
- `update(updates)` - Update configuration with validation
- `isTLSEnabled()` - Check if TLS is enabled
- `isAuthenticationEnabled()` - Check if authentication is enabled

### ProxyConfigBuilder

Fluent configuration builder.

```typescript
const config = createProxyConfig()
  .target('ws://backend.example.com/ws')
  .port(3000)
  .maxConnections(1000)
  .build();
```

### BunProxyServer

Main proxy server class.

```typescript
const server = new BunProxyServer(config);
await server.start();
await server.stop();
```

#### Methods

- `start()` - Start the proxy server
- `stop()` - Stop the proxy server
- `getStats()` - Get current statistics
- `getActiveConnections()` - Get active connections
- `isRunning()` - Check if server is running

## 🧪 Examples

### Production Setup

```typescript
import { ProxyServerConfig, BunProxyServer } from './index';

async function productionSetup() {
  const config = new ProxyServerConfig({
    targetUrl: 'wss://backend.example.com/ws',
    listenPort: 443,
    listenHost: '0.0.0.0',

    // TLS
    tls: {
      cert: await Bun.file('./cert.pem').text(),
      key: await Bun.file('./key.pem').text(),
    },

    // Security
    authentication: {
      type: 'bearer',
      token: process.env.PROXY_TOKEN!,
    },

    rateLimiting: {
      enabled: true,
      windowMs: 60000,
      maxRequests: 1000,
    },

    // Performance
    maxConnections: 50000,
    compression: { enabled: true, algorithm: 'gzip' },

    // Monitoring
    health: { enabled: true, interval: 30000 },
    stats: { collectionInterval: 10000 },
  });

  const server = new BunProxyServer(config);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await server.stop();
    process.exit(0);
  });

  await server.start();
  console.log('🚀 Production proxy running');
}

productionSetup().catch(console.error);
```

### Load Balanced Setup

```typescript
const config = new ProxyServerConfig({
  targetUrl: 'ws://backend1.example.com/ws',
  loadBalancing: {
    strategy: 'weighted',
    targets: [
      { url: 'ws://backend1.example.com/ws', weight: 1 },
      { url: 'ws://backend2.example.com/ws', weight: 2 },
      { url: 'ws://backend3.example.com/ws', weight: 1 },
    ],
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      interval: 5000,
      unhealthyThreshold: 2,
    },
  },
});
```

## 🏃‍♂️ Running

### Development

```bash
bun run index.ts
```

### Production

```bash
bun start
```

### With Environment Variables

```bash
PROXY_TARGET_URL=ws://localhost:8080/ws \
PROXY_PORT=3000 \
PROXY_DEBUG=true \
bun run index.ts
```

## 🧪 Testing

```bash
bun test
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the examples

## 🎨 **Enhanced Naming Conventions**

This project follows professional naming conventions to improve code clarity and maintainability:

### **Core Classes**
- `ProxyServerConfig` - Main configuration class (backward compatible)
- `ProxyConfigBuilder` - Fluent API builder pattern
- `BunProxyServer` - Main server implementation

### **Enhanced Internal Names**
- `BunWebSocketProxyConfiguration` - Enhanced configuration interface
- `WebSocketConnectionManager` - Connection tracking and management
- `WebSocketProxyPerformanceMetrics` - Performance and statistics tracking

### **Error Hierarchy**
- `WebSocketProxyOperationalError` - Base operational error
- `WebSocketProxyConfigurationError` - Configuration validation errors
- `WebSocketProxyConnectionError` - Connection-specific errors

### **Migration Path**
The project maintains backward compatibility while offering enhanced naming:

```typescript
// Legacy names (still supported)
import { ProxyServerConfig, ConfigurationError } from './index';

// Enhanced names (recommended)
import { BunWebSocketProxyConfiguration, WebSocketProxyConfigurationError } from './index';
```

For complete details, see [ENHANCED_NAMING.md](./ENHANCED_NAMING.md).

---

**Built with ❤️ using [Bun](https://bun.com)**
