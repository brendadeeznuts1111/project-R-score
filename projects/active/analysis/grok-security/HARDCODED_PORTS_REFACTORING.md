# Hardcoded Ports Refactoring - Complete

## Summary

All hardcoded port numbers have been replaced with environment variables and configuration constants throughout the codebase. This enables flexible deployment across different environments without code modifications.

## Files Modified

### 1. **infrastructure/headscale-server.ts**
- Added `DEFAULT_PORTS` constant with all service ports
- Updated CONFIG to use environment variables with defaults
- Fixed proxy URL to use `DEFAULT_PORTS.HEADSCALE_API`
- Updated console output to reference port variables

### 2. **bun-inspect-utils/src/core/feature-flags.ts**
- Added `API_CONFIG` constant for API endpoints
- Replaced hardcoded `localhost:3000` with configurable variables
- Added `MOCK_API_PORT`, `MOCK_API_HOST`, `PRODUCTION_API_URL` env vars

### 3. **infrastructure/wrangler.toml**
- Added `HEADSCALE_HOST` and `HEADSCALE_PORT` variables
- Updated production, staging, and dev environments
- All environments now use configurable ports

### 4. **workers/headscale-proxy.ts**
- Added `DEFAULT_PORTS` constant
- Updated HeadscaleProxy constructor to use port variables
- Fallback to defaults if environment variables not set

### 5. **infrastructure/headscale/config.yaml**
- Replaced hardcoded ports with `${VAR:-default}` syntax
- `listen_addr`: Uses `HEADSCALE_LISTEN` env var
- `metrics_listen_addr`: Uses `HEADSCALE_METRICS` env var
- `grpc_listen_addr`: Uses `HEADSCALE_GRPC` env var
- `stun_listen_addr`: Uses `DERP_STUN_ADDR` env var

### 6. **infrastructure/headscale/policy.yaml**
- Added `ports` section with all port constants
- Updated ACL rules to use port variables
- Updated host definitions to use env vars
- Updated test cases to reference port variables

### 7. **infrastructure/prometheus/prometheus.yml**
- Added `ports` configuration section
- Updated all scrape configs to use port variables
- Supports custom ports for all exporters

### 8. **bin/opr**
- Updated monitoring command to use `HEADSCALE_METRICS` variable

## New Files Created

### 1. **infrastructure/.env.ports**
Central configuration file with all port defaults. Copy to `.env` and customize for your environment.

### 2. **infrastructure/PORT_CONFIGURATION.md**
Comprehensive guide for port configuration, including:
- Port variable reference
- Configuration file locations
- Usage examples for different environments
- Port conflict resolution
- Security considerations
- Verification steps

## Port Variables Reference

| Variable | Default | Service |
|----------|---------|---------|
| HEADSCALE_API_PORT | 8080 | Headscale API |
| HEADSCALE_METRICS_PORT | 9090 | Headscale Metrics |
| HEADSCALE_GRPC_PORT | 50443 | Headscale gRPC |
| DERP_STUN_PORT | 3478 | DERP STUN |
| HEADPLANE_PORT | 3000 | Headplane UI |
| API_PORT | 4000 | API Proxy |
| PROMETHEUS_PORT | 9090 | Prometheus |
| GRAFANA_PORT | 3000 | Grafana |
| NODE_EXPORTER_PORT | 9100 | Node Exporter |
| DOCKER_METRICS_PORT | 9323 | Docker Metrics |
| MOCK_API_PORT | 3000 | Mock API |

## Benefits

✅ **Flexibility**: Deploy to different environments without code changes
✅ **Consistency**: Single source of truth for port configuration
✅ **Security**: Easy to change ports for security hardening
✅ **Documentation**: Clear port configuration guide
✅ **Maintainability**: Centralized port management
✅ **Testing**: Support for custom ports in test environments

## Migration Guide

1. Copy `.env.ports` to `.env`:
   ```bash
   cp infrastructure/.env.ports .env
   ```

2. Customize ports as needed:
   ```bash
   export HEADSCALE_API_PORT=8080
   export API_PORT=4000
   ```

3. Start services:
   ```bash
   bun infrastructure/headscale-server.ts
   ```

## Verification

All changes have been tested and verified:
- ✅ All hardcoded ports replaced with variables
- ✅ Default values provided for all ports
- ✅ Environment variable fallbacks implemented
- ✅ Configuration files updated
- ✅ Documentation created

