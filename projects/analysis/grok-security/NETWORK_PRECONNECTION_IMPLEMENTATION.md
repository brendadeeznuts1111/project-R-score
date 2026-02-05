# Network Preconnection Implementation

## Summary

Successfully implemented **Bun-native network preconnection system** with CLI flags for optimizing network performance across the grok-security infrastructure.

**Reference:** https://bun.com/docs/runtime/networking/fetch#preconnect-to-a-host

## Files Created

### 1. **infrastructure/network-preconnect.ts**
Core preconnection module with:
- `preconnectHost()` - Preconnect to single host
- `preconnectAll()` - Batch preconnection with parallel/sequential modes
- `getPreconnectStats()` - Performance statistics
- `DEFAULT_PRECONNECT_TARGETS` - Default infrastructure targets

**Features:**
- DNS resolution
- TCP connection establishment
- TLS handshake for HTTPS
- Configurable timeouts
- Latency measurement
- Verbose logging

### 2. **infrastructure/network-preconnect-cli.ts**
CLI wrapper for preconnection with:
- `--all` - Preconnect to all targets
- `--host=<host>` - Single host preconnection
- `--port=<port>` - Custom port (default: 443)
- `--protocol=<http|https>` - Protocol selection
- `--parallel=<true|false>` - Execution mode
- `--verbose` - Detailed output
- `--stats` - Performance statistics
- `--help` - Usage information

### 3. **infrastructure/NETWORK_PRECONNECT.md**
Comprehensive documentation covering:
- How preconnection works
- CLI command reference
- Default targets table
- Programmatic usage examples
- Performance benefits
- Configuration options
- Troubleshooting guide

## Files Modified

### 1. **bin/opr** (Operator CLI)
Added 4 new network commands:

```bash
opr network:preconnect              # Preconnect to all hosts
opr network:warmup [parallel]       # Warm up connections
opr network:status                  # Check connectivity
opr network:test [host] [port] [protocol]  # Test single host
```

Updated help section with network command documentation.

### 2. **infrastructure/headscale-server.ts**
- Imported preconnection module
- Added preconnection initialization on startup
- Runs in parallel before service startup
- Non-blocking with error handling

## Default Preconnect Targets

| Host | Port | Protocol | Service |
|------|------|----------|---------|
| localhost | 8080 | http | Headscale API |
| localhost | 9090 | http | Metrics |
| localhost | 3000 | http | Headplane UI |
| localhost | 4000 | http | API Proxy |
| api.example.com | 443 | https | Production API |
| 100.64.0.10 | 8080 | http | Tailscale Headscale |

## CLI Usage Examples

### Preconnect All Targets
```bash
opr network:preconnect
# Output: 🔗 Preconnecting to infrastructure hosts...
#         ✅ Preconnected to http://localhost:8080 (12.34ms)
#         ✅ Preconnected to http://localhost:9090 (8.56ms)
#         ... etc
```

### Warm Up with Statistics
```bash
opr network:warmup true
# Shows: Total, Successful, Failed, Avg/Min/Max Latency
```

### Test Single Host
```bash
opr network:test api.example.com 443 https
# Output: 🔗 Testing connection to https://api.example.com:443
#         ✅ Connected in 45.67ms
```

### Check Network Status
```bash
opr network:status
# Shows detailed connectivity report with statistics
```

## Programmatic Usage

### Basic Example
```typescript
import { preconnectHost } from "./infrastructure/network-preconnect";

const result = await preconnectHost({
  host: "api.example.com",
  port: 443,
  protocol: "https",
  timeout: 5000,
});

console.log(`Connected in ${result.latency}ms`);
```

### Batch Example
```typescript
import { preconnectAll, getPreconnectStats } from "./infrastructure/network-preconnect";

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

✅ **Reduced Latency** - Connections established before requests  
✅ **Parallel Execution** - Multiple hosts preconnected simultaneously  
✅ **Automatic Startup** - Integrated into server initialization  
✅ **Configurable** - Add custom targets as needed  
✅ **Non-Blocking** - Doesn't delay service startup  
✅ **Detailed Metrics** - Latency tracking and statistics  

## Integration Points

1. **headscale-server.ts** - Preconnects on startup
2. **workers/headscale-proxy.ts** - Can leverage preconnected hosts
3. **CLI (bin/opr)** - Manual preconnection commands
4. **Custom applications** - Import and use preconnection module

## Next Steps

To use the network preconnection system:

1. **Start server with preconnection:**
   ```bash
   bun infrastructure/headscale-server.ts
   ```

2. **Manually preconnect:**
   ```bash
   opr network:preconnect
   ```

3. **Test connectivity:**
   ```bash
   opr network:test localhost 8080 http
   ```

4. **Monitor performance:**
   ```bash
   opr network:status
   ```

## Configuration

### Custom Targets

Edit `DEFAULT_PRECONNECT_TARGETS` in `network-preconnect.ts`:

```typescript
export const DEFAULT_PRECONNECT_TARGETS: PreconnectTarget[] = [
  { host: "your-host.com", port: 443, protocol: "https" },
  { host: "internal.local", port: 8080, protocol: "http" },
];
```

### Environment Variables

```bash
# Can be extended to support custom targets via env vars
export PRECONNECT_HOSTS="api.example.com:443:https,internal.local:8080:http"
```

