---
name: exchange
description: Sportsbook exchange operations. Use when checking exchange health, listing markets, finding arbitrage opportunities, or monitoring real-time odds feeds.
---

# Exchange

Sportsbook exchange operations and real-time odds monitoring.

## Usage

```text
/exchange health   - Check exchange health status
/exchange markets  - List active markets
/exchange arb      - Get arbitrage opportunities
/exchange metrics  - View exchange performance metrics
/exchange ws       - Monitor WebSocket feed
```

## HTTP Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /mcp/exchange/health` | Exchange health check |
| `GET /mcp/exchange/markets` | List active markets |
| `GET /mcp/exchange/arb` | Arbitrage opportunities |
| `GET /mcp/exchange/metrics` | Performance metrics |
| `WS /mcp/exchange` | Real-time WebSocket feed |

## Examples

```bash
# Check exchange health
curl http://localhost:3333/mcp/exchange/health

# Get current markets
curl http://localhost:3333/mcp/exchange/markets

# Find arbitrage opportunities
curl http://localhost:3333/mcp/exchange/arb

# Get exchange metrics
curl http://localhost:3333/mcp/exchange/metrics
```

## WebSocket Connection

```bash
# Monitor real-time feed
bun --eval "
const ws = new WebSocket('ws://localhost:3333/mcp/exchange');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
"
```

## Message Types

| Type | Description |
|------|-------------|
| `MARKET_UPDATE` | Odds/price changes |
| `HEARTBEAT` | Connection keepalive |
| `RISK_ALERT` | Risk threshold exceeded |
| `ARBITRAGE` | Arbitrage opportunity detected |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `EXCHANGE_ENABLED` | true | Enable exchange handler |
| `EXCHANGE_MOCK_MODE` | true (dev) | Use mock data |
| `EXCHANGE_MOCK_INTERVAL_MS` | 100 | Mock update interval |
| `EXCHANGE_MOCK_MARKETS_COUNT` | 10 | Number of mock markets |
| `EXCHANGE_HEARTBEAT_INTERVAL_MS` | 5000 | WebSocket heartbeat |
| `EXCHANGE_ENABLE_RISK_ALERTS` | true | Broadcast risk alerts |
| `EXCHANGE_ENABLE_ARBITRAGE_ALERTS` | true | Broadcast arb alerts |

## Performance

- Real-time updates: 10/sec (configurable)
- Heartbeat: Every 5 seconds
- Latency: <10.8ms p99
- Daily requests: 35,546+ across 5 regions

## Related Skills

- `/dev` - Start development server
- `/metrics` - System-wide performance metrics
