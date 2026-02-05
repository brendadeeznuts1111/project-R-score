# DuoPlus Server Spec Tokens v3.6

*Extracted from production health endpoint - immutable configuration values for Cash App Green + Lightning integration*

## Quick Reference

| Token | Value | Use Case |
|-------|-------|----------|
| `BUN_SERVER_PORT` | `3227` | Default DuoPlus port |
| `CASHAPP_API_BASE` | `https://api.cash.app/v1` | REST API endpoint |
| `LND_INVOICE_ENDPOINT` | `${LND_REST_URL}/v1/invoices` | BOLT-11 generation |
| `FINCR_CTR_DAILY` | `10000` | FinCEN reporting threshold |
| `S3_LOG_CASHAPP` | `logs/cashapp-green/${traceId}.zst` | Compressed audit trail |
| `TEST_TIMEOUT_MS` | `10000` | Async test timeout |

## Current Dashboard Status

- **Status**: pass (HTTP 200)
- **Health Score**: 100/100
- **Environment**: development
- **Bun Version**: 1.3.6
- **Server Port**: 3227

## Feature Gates

- `aiRiskPrediction`: enabled
- `familyControls`: enabled
- `cashAppPriority`: enabled

## Memory Thresholds

- Warning: 85%
- Critical: 95%
- Current Usage: 71%

## CPU Thresholds

- Scale trigger: 75%
- Current Load: 0%

## Related Documentation

- See `src/admin/config-server.ts` for implementation
- See `src/nexus/phases/` for phase implementations
- See `docs/` for additional integration guides
