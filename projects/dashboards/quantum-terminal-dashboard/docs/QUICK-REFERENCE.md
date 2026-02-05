# Quick Reference Guide

**Common commands and operations for Quantum Terminal Dashboard**

---

## 🚀 Getting Started

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Run all tests
bun test

# Build for production
bun run build
```

---

## 🎯 Headscale Operations

### Start Server
```bash
bun run headscale:start
# Server runs on http://localhost:8080
# Metrics on http://localhost:9090/metrics
```

### User Management
```bash
# Create user
bun run headscale:user:create admin

# List users
bun run src/headscale-cli.ts user list

# Delete user
bun run src/headscale-cli.ts user delete <user_id>
```

### Auth Keys
```bash
# Create auth key
bun run src/headscale-cli.ts authkey create <user_id> --reusable --expiration 24h

# List auth keys
bun run src/headscale-cli.ts authkey list <user_id>
```

### Node Management
```bash
# List nodes for user
bun run src/headscale-cli.ts node list <user_id>

# Delete node
bun run src/headscale-cli.ts node delete <node_id>
```

---

## 🔧 Operator CLI (opr)

```bash
# Health check
opr health:full

# Start Headscale
opr headscale:start

# Create user
opr user:create <name>

# Register node
opr node:register

# List users
opr users:list

# List nodes
opr nodes:list <user_id>

# View metrics
opr metrics

# View logs
opr logs
```

---

## 📊 Performance & Monitoring

```bash
# Start performance monitor
bun run perf:monitor

# Terminal performance view
bun run perf:terminal

# Run SIMD benchmarks
bun run simd:benchmark

# Test buffer operations
bun run simd:test-buffer

# Test spawn performance
bun run simd:test-spawn
```

---

## 🏗️ Build Operations

```bash
# Build universal profile
bun run build

# Build all profiles
bun run build:all

# Development build with HMR
bun run build:dev

# Build SIMD optimized
bun run build:simd

# Build hyper optimized
bun run build:hyper
```

---

## 🧪 Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test test/headscale-integration.test.ts

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

---

## 🌐 Cloudflare Workers

```bash
# Deploy to Cloudflare
wrangler deploy --env production

# View logs
wrangler tail --env production

# Set secrets
wrangler secret put HEADSCALE_API_KEY --env production

# Local development
wrangler dev
```

---

## 📁 Configuration

### Environment Variables
```bash
# Server
HEADSCALE_PORT=8080
HEADSCALE_METRICS_PORT=9090
HEADSCALE_API_KEY=tskey-api-default
HEADSCALE_DB_PATH=./headscale.db

# HTTP
HTTP_PORT=4444
WS_PORT=3001
WEBSOCKET_URL=wss://api.example.com/terminal

# Build
BUILD_TIMESTAMP=$(date +%s)
```

### Configuration Files
- `.config/bun.yaml` – Bun configuration
- `.config/config.yaml` – Application config
- `.config/quantum-config.yaml` – Quantum config
- `headscale/config.yaml` – Headscale config
- `headscale/policy.yaml` – ACL policies

---

## 📚 Documentation

- **[docs/INDEX.md](./INDEX.md)** – Full documentation index
- **[docs/HEADSCALE-BUN-NATIVE.md](./HEADSCALE-BUN-NATIVE.md)** – Bun-native setup
- **[docs/HEADSCALE-DEPLOYMENT-GUIDE.md](./HEADSCALE-DEPLOYMENT-GUIDE.md)** – Deployment
- **[docs/BUN-1.5.x-INTEGRATION-GUIDE.md](./BUN-1.5.x-INTEGRATION-GUIDE.md)** – Bun features
- **[docs/PROJECT-STATUS-FINAL.md](./PROJECT-STATUS-FINAL.md)** – Project status

---

## 🔗 API Endpoints

### Headscale API
```
GET  /health                          # Health check
GET  /api/v1/users                    # List users
POST /api/v1/users                    # Create user
GET  /api/v1/users/{id}               # Get user nodes
POST /api/v1/preauthkeys              # Create auth key
GET  /metrics                         # Prometheus metrics
```

### Cloudflare Worker
```
POST /api/headscale/*                 # Proxy to Headscale
GET  /metrics                         # Analytics metrics
```

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check port availability
lsof -i :8080

# Check database
ls -la headscale.db

# Check logs
tail -f headscale.log
```

### Tests failing
```bash
# Run specific test
bun test test/headscale-integration.test.ts

# Run with verbose output
bun test --verbose

# Check test file
cat test/headscale-integration.test.ts
```

### Build issues
```bash
# Clean build
rm -rf dist/ && bun run build

# Check TypeScript
bun run tsc --noEmit

# Check dependencies
bun install --force
```

---

## 📞 Support

For detailed information, see:
- **[docs/INDEX.md](./INDEX.md)** – Documentation index
- **[docs/HEADSCALE-DEPLOYMENT-GUIDE.md](./HEADSCALE-DEPLOYMENT-GUIDE.md)** – Deployment help
- **[docs/BUN-1.5.x-INTEGRATION-GUIDE.md](./BUN-1.5.x-INTEGRATION-GUIDE.md)** – Feature help

