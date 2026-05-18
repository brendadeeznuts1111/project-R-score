# Port Configuration Guide

This document describes how ports are configured across the grok-security infrastructure.

## Overview

All hardcoded ports have been replaced with environment variables and configuration constants. This allows for flexible deployment across different environments without code changes.

## Port Variables

### Headscale Services
- **HEADSCALE_API_PORT** (default: 8080) - Headscale API server
- **HEADSCALE_METRICS_PORT** (default: 9090) - Headscale metrics endpoint
- **HEADSCALE_GRPC_PORT** (default: 50443) - Headscale gRPC server

### DERP (Relay)
- **DERP_STUN_PORT** (default: 3478) - STUN server for NAT traversal

### UI & Monitoring
- **HEADPLANE_PORT** (default: 3000) - Headplane UI
- **PROMETHEUS_PORT** (default: 9090) - Prometheus metrics
- **GRAFANA_PORT** (default: 3000) - Grafana dashboards
- **NODE_EXPORTER_PORT** (default: 9100) - Node exporter metrics
- **DOCKER_METRICS_PORT** (default: 9323) - Docker metrics

### API Services
- **API_PORT** (default: 4000) - API proxy server
- **MOCK_API_PORT** (default: 3000) - Mock API for testing

## Configuration Files

### 1. Environment Variables (`.env.ports`)
Central configuration file with all port defaults. Copy to `.env` and customize:

```bash
cp infrastructure/.env.ports .env
# Edit .env with your custom ports
```

### 2. TypeScript Configuration (`infrastructure/headscale-server.ts`)
```typescript
const DEFAULT_PORTS = {
  HEADSCALE_API: 8080,
  HEADSCALE_METRICS: 9090,
  HEADPLANE: 3000,
  API_PROXY: 4000,
  DERP_STUN: 3478,
  GRPC: 50443,
};
```

### 3. YAML Configuration Files
- `infrastructure/headscale/config.yaml` - Uses `${VAR:-default}` syntax
- `infrastructure/headscale/policy.yaml` - ACL rules with port variables
- `infrastructure/prometheus/prometheus.yml` - Scrape configs with port variables
- `infrastructure/wrangler.toml` - Cloudflare Workers configuration

### 4. Feature Flags (`bun-inspect-utils/src/core/feature-flags.ts`)
```typescript
const API_CONFIG = {
  MOCK_PORT: parseInt(process.env.MOCK_API_PORT || "3000"),
  MOCK_HOST: process.env.MOCK_API_HOST || "localhost",
  PRODUCTION_URL: process.env.PRODUCTION_API_URL || "https://api.production.com",
};
```

## Usage Examples

### Development Environment
```bash
export HEADSCALE_API_PORT=8080
export API_PORT=4000
export HEADPLANE_PORT=3000
bun infrastructure/headscale-server.ts
```

### Production Environment
```bash
export HEADSCALE_API_PORT=8080
export HEADSCALE_METRICS_PORT=9090
export API_PORT=4000
export HEADPLANE_PORT=3000
export DERP_STUN_PORT=3478
bun infrastructure/headscale-server.ts
```

### Docker Compose
```yaml
services:
  headscale:
    environment:
      HEADSCALE_LISTEN: "0.0.0.0:${HEADSCALE_API_PORT:-8080}"
      HEADSCALE_METRICS: "0.0.0.0:${HEADSCALE_METRICS_PORT:-9090}"
```

## Port Conflicts

If you encounter port conflicts:

1. Check which service is using the port:
   ```bash
   lsof -i :8080
   ```

2. Update the environment variable:
   ```bash
   export HEADSCALE_API_PORT=8081
   ```

3. Restart the service

## Security Considerations

- **Firewall Rules**: Update firewall rules to match your custom ports
- **ACL Rules**: The policy.yaml file automatically uses configured ports
- **Reverse Proxy**: If using a reverse proxy, update port mappings
- **TLS/SSL**: Ensure certificates match your configured ports

## Verification

To verify port configuration:

```bash
# Check environment variables
env | grep PORT

# Check listening ports
netstat -tlnp | grep LISTEN

# Test connectivity
curl http://localhost:8080/health
```

