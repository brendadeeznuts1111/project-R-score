# Network Preconnection Guide

## Overview

Network preconnection is a performance optimization technique that establishes connections to remote hosts before they're actually needed. This reduces latency when making requests to those hosts.

**Reference:** https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host

## How It Works

The preconnection system uses Bun's native fetch API to establish:
- **DNS resolution** - Resolves hostname to IP address
- **TCP connection** - Establishes socket connection
- **TLS handshake** - For HTTPS connections

This happens in parallel, reducing the time needed when actual requests are made.

## CLI Commands

### Preconnect to All Targets

```bash
opr network:preconnect
```

Preconnects to all default infrastructure targets with verbose output.

### Warm Up Connections

```bash
# Parallel (default)
opr network:warmup

# Sequential
opr network:warmup false
```

Warms up all connections with statistics.

### Check Network Status

```bash
opr network:status
```

Checks connectivity to all infrastructure hosts and displays statistics.

### Test Single Host

```bash
opr network:test localhost 8080 http
opr network:test api.example.com 443 https
```

Tests connection to a specific host with detailed output.

## Default Preconnect Targets

The system preconnects to these targets by default:

| Host | Port | Protocol | Service |
|------|------|----------|---------|
| localhost | 8080 | http | Headscale API |
| localhost | 9090 | http | Metrics |
| localhost | 3000 | http | Headplane UI |
| localhost | 4000 | http | API Proxy |
| api.example.com | 443 | https | Production API |
| 100.64.0.10 | 8080 | http | Tailscale Headscale |

## Programmatic Usage

### Basic Preconnection

```typescript
import { preconnectHost } from "./network-preconnect";

const result = await preconnectHost({
  host: "api.example.com",
  port: 443,
  protocol: "https",
  timeout: 5000,
});

console.log(`Connected in ${result.latency}ms`);
```

### Batch Preconnection

```typescript
import { preconnectAll, getPreconnectStats } from "./network-preconnect";

const results = await preconnectAll({
  targets: [
    { host: "localhost", port: 8080, protocol: "http" },
    { host: "api.example.com", port: 443, protocol: "https" },
  ],
  parallel: true,
  verbose: true,
});

const stats = getPreconnectStats(results);
console.log(`Average latency: ${stats.avgLatency}ms`);
```

## Performance Benefits

- **Reduced latency** - Connections established before requests
- **Parallel execution** - Multiple hosts preconnected simultaneously
- **Automatic startup** - Integrated into server initialization
- **Configurable** - Add custom targets as needed

## Configuration

### Environment Variables

```bash
# Add custom preconnect targets
export PRECONNECT_HOSTS="api.example.com:443:https,internal.local:8080:http"
```

### Custom Targets

Edit `DEFAULT_PRECONNECT_TARGETS` in `network-preconnect.ts`:

```typescript
export const DEFAULT_PRECONNECT_TARGETS: PreconnectTarget[] = [
  { host: "your-host.com", port: 443, protocol: "https" },
  // ... more targets
];
```

## Troubleshooting

### Connection Timeouts

Increase timeout in CLI:
```bash
opr network:test api.example.com 443 https --timeout=10000
```

### Failed Connections

Check if host is reachable:
```bash
ping api.example.com
curl -v https://api.example.com
```

### Performance Issues

Monitor latency with stats:
```bash
opr network:status
```

## Integration Points

- **headscale-server.ts** - Preconnects on startup
- **workers/headscale-proxy.ts** - Can use preconnected hosts
- **CLI (bin/opr)** - Manual preconnection commands

