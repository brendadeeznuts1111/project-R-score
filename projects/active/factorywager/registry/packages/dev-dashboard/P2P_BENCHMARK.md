# P2P Gateway Benchmark Tool

Comprehensive benchmarking tool for P2P payment gateways with detailed metrics collection.

## Quick Start

```bash
# Run with default settings (venmo, cashapp, paypal)
bun run p2p-benchmark

# Or directly
bun src/p2p-gateway-benchmark.ts
```

## Usage Examples

### Basic Usage

```bash
# Using npm script (from package directory)
bun run p2p-benchmark

# Direct execution
bun src/p2p-gateway-benchmark.ts --gateways venmo,cashapp,paypal --operations create,query,switch

# With dry-run and full lifecycle
bun src/p2p-gateway-benchmark.ts --iterations 50 --include-dry-run --include-full

# JSON output
bun src/p2p-gateway-benchmark.ts --json --output results.json

# Compare mode (detailed output)
bun src/p2p-gateway-benchmark.ts --compare
```

### Advanced Examples

```bash
# Test specific gateways with custom operations
bun src/p2p-gateway-benchmark.ts \
  --gateways venmo,cashapp,paypal,zelle,wise,revolut \
  --operations create,query,switch,webhook \
  --iterations 100

# Include all operation types
bun src/p2p-gateway-benchmark.ts \
  --operations create,query,switch,dry-run,full,webhook \
  --include-dry-run \
  --include-full \
  --iterations 50

# Save results and show summary
bun src/p2p-gateway-benchmark.ts \
  --output benchmark-results.json \
  --json \
  --summary

# Quick comparison test
bun src/p2p-gateway-benchmark.ts \
  --gateways venmo,cashapp \
  --operations create,query \
  --iterations 10 \
  --compare
```

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `--gateways <list>` | Comma-separated list of gateways | `--gateways venmo,cashapp,paypal` |
| `--operations <list>` | Comma-separated list of operations | `--operations create,query,switch` |
| `--iterations <n>` | Number of iterations per benchmark | `--iterations 100` |
| `--include-dry-run` | Include dry-run operation | `--include-dry-run` |
| `--include-full` | Include full lifecycle operation | `--include-full` |
| `--output <file>` | Output results to JSON file | `--output results.json` |
| `--json` | Output results as JSON | `--json` |
| `--compare` | Compare gateways side-by-side | `--compare` |
| `--summary` | Show summary statistics | `--summary` |
| `--help` | Show help message | `--help` |

## Supported Gateways

- `venmo` - Venmo P2P payments
- `cashapp` - Cash App
- `paypal` - PayPal
- `zelle` - Zelle
- `wise` - Wise (formerly TransferWise)
- `revolut` - Revolut

## Supported Operations

- `create` - Create a new transaction
- `query` - Query transaction status
- `switch` - Switch gateway environment (sandbox/production)
- `dry-run` - Validate transaction without execution (requires `--include-dry-run`)
- `full` - Full transaction lifecycle (requires `--include-full`)
- `webhook` - Process webhook notification
- `refund` - Refund a transaction
- `dispute` - Handle transaction dispute

## Output Formats

### Default Output
Shows a summary with total operations, success rate, and fastest gateway:
```
🎯 P2P Benchmark Complete!
==================================================
Total operations: 20
Gateways tested: 2
Operations tested: 2
Overall success rate: 100.0%
🏆 Fastest gateway: cashapp (130.92ms)
```

### Compare Mode (`--compare`)
Shows detailed breakdown by gateway and operation:
```
📊 P2P Gateway Benchmark Results
==================================================

VENMO:
------------------------------
  create:
    Success Rate: 100.0% (3/3)
    Avg Duration: 181.95ms
    Min/Max: 159.23ms / 200.09ms

CASHAPP:
------------------------------
  create:
    Success Rate: 100.0% (3/3)
    Avg Duration: 153.64ms
    Min/Max: 132.70ms / 168.42ms
```

### JSON Output (`--json`)
Returns structured JSON data:
```json
{
  "results": [
    {
      "gateway": "venmo",
      "operation": "create",
      "durationMs": 181.95,
      "success": true,
      "requestSize": 256,
      "responseSize": 512,
      "statusCode": 201,
      "endpoint": "/api/transactions/create"
    }
  ],
  "summary": {
    "totalOperations": 20,
    "successfulOps": 20,
    "failedOps": 0,
    "successRate": 100.0,
    "gateways": { ... },
    "operations": { ... }
  }
}
```

## Integration with Dashboard

The benchmark tool integrates seamlessly with the enhanced dashboard:

1. **Automatic Integration**: The dashboard automatically uses this benchmark class when `P2P_USE_DEDICATED_BENCHMARK` is not set to `false`

2. **Database Storage**: Results are automatically stored in the dashboard's SQLite database

3. **Real-time Updates**: Results are broadcast via WebSocket to connected dashboard clients

4. **Metrics API**: Access aggregated metrics via `/api/p2p/metrics` endpoint

## Performance Characteristics

Each gateway has realistic latency simulation:

| Gateway | Create Latency | Query Latency |
|---------|---------------|--------------|
| Venmo | ~150ms | ~100ms |
| Cash App | ~120ms | ~80ms |
| PayPal | ~200ms | ~150ms |
| Zelle | ~180ms | ~120ms |
| Wise | ~220ms | ~180ms |
| Revolut | ~160ms | ~90ms |

## Tips

- Start with fewer iterations (`--iterations 10`) for quick tests
- Use `--compare` mode to identify performance differences between gateways
- Save results with `--output` for later analysis
- Combine `--json` and `--output` to create data files for analysis tools
- Use `--summary` with default output to see detailed statistics

## Troubleshooting

**Issue**: Benchmark takes too long
- **Solution**: Reduce `--iterations` value (default is 100)

**Issue**: Missing operations in results
- **Solution**: Ensure `--include-dry-run` or `--include-full` flags are set for those operations

**Issue**: Want to test only specific gateways
- **Solution**: Use `--gateways` to limit to specific gateways (e.g., `--gateways venmo,cashapp`)

## See Also

- [Enhanced Dashboard Documentation](./README.md)
- [P2P Configuration](./config.toml) - Gateway configuration settings
- [API Documentation](./API.md) - Dashboard API endpoints
