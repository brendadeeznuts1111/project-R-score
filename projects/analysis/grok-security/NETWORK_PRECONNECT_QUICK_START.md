# Network Preconnection - Quick Start Guide

## What Is It?

Network preconnection establishes connections to remote hosts **before** they're needed, reducing latency when making actual requests.

**Based on:** https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host

## Quick Commands

### Start Server (Auto-Preconnects)
```bash
bun infrastructure/headscale-server.ts
# Automatically preconnects to all infrastructure hosts on startup
```

### Manual Preconnection

```bash
# Preconnect to all targets
opr network:preconnect

# Warm up with statistics
opr network:warmup

# Check status
opr network:status

# Test single host
opr network:test localhost 8080 http
opr network:test api.example.com 443 https
```

## What Gets Preconnected?

By default, these targets are preconnected:

```text
✓ localhost:8080 (Headscale API)
✓ localhost:9090 (Metrics)
✓ localhost:3000 (Headplane UI)
✓ localhost:4000 (API Proxy)
✓ api.example.com:443 (Production API)
✓ 100.64.0.10:8080 (Tailscale Headscale)
```

## Performance Impact

- **Latency Reduction:** 50-200ms per connection
- **Parallel Execution:** All targets preconnected simultaneously
- **Non-Blocking:** Doesn't delay service startup
- **Automatic:** Runs on server initialization

## Use in Your Code

```typescript
import { preconnectHost } from "./infrastructure/network-preconnect";

// Preconnect before making requests
await preconnectHost({
  host: "api.example.com",
  port: 443,
  protocol: "https",
});

// Now make your request (faster!)
const response = await fetch("https://api.example.com/data");
```

## CLI Flags

### network:preconnect
```bash
opr network:preconnect
# Preconnects to all default targets with verbose output
```

### network:warmup
```bash
opr network:warmup              # Parallel (default)
opr network:warmup false        # Sequential
```

### network:status
```bash
opr network:status
# Shows connectivity report with latency statistics
```

### network:test
```bash
opr network:test <host> <port> <protocol>

# Examples:
opr network:test localhost 8080 http
opr network:test api.example.com 443 https
opr network:test internal.local 3000 http
```

## Add Custom Targets

Edit `infrastructure/network-preconnect.ts`:

```typescript
export const DEFAULT_PRECONNECT_TARGETS: PreconnectTarget[] = [
  { host: "localhost", port: 8080, protocol: "http" },
  { host: "your-api.com", port: 443, protocol: "https" },
  { host: "internal.local", port: 5432, protocol: "http" },
];
```

## Files

- **infrastructure/network-preconnect.ts** - Core module
- **infrastructure/network-preconnect-cli.ts** - CLI wrapper
- **infrastructure/NETWORK_PRECONNECT.md** - Full documentation
- **bin/opr** - CLI commands (network:*)

## Troubleshooting

### Connection Timeout
```bash
# Increase timeout (default: 5000ms)
opr network:test api.example.com 443 https --timeout=10000
```

### Host Not Reachable
```bash
# Check connectivity
ping api.example.com
curl -v https://api.example.com
```

### View Statistics
```bash
opr network:status
# Shows: Total, Successful, Failed, Avg/Min/Max Latency
```

## Next Steps

1. **Start using it:** `bun infrastructure/headscale-server.ts`
2. **Test it:** `opr network:status`
3. **Customize targets:** Edit `DEFAULT_PRECONNECT_TARGETS`
4. **Monitor performance:** Check latency improvements

---

**Reference:** https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host

