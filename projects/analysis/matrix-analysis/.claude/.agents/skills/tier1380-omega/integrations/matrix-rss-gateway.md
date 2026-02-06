# Matrix RSS Gateway Integration

## Overview

The Tier-1380 Matrix RSS Gateway integrates the Bun 1.3.8 Test Options Matrix with:
- **Cloudflare Domain** (factory-wager.com)
- **RSS Feeds** for matrix updates
- **Kimi Shell** for CLI completions

## Deployment

```bash
# Deploy full integration
./deploy/scripts/deploy-matrix-integration.sh production
```

## Endpoints

| Endpoint | URL | Description |
|----------|-----|-------------|
| Health | `https://matrix.factory-wager.com/health` | Service health |
| Matrix API | `https://matrix.factory-wager.com/matrix` | Query matrix |
| RSS Feed | `https://matrix.factory-wager.com/rss` | RSS feed |
| MCP | `https://matrix.factory-wager.com/mcp/matrix` | MCP protocol |
| Kimi Shell | `https://matrix.factory-wager.com/kimi/complete` | CLI completions |
| WebSocket | `wss://matrix.factory-wager.com/ws` | Real-time updates |

## Kimi Shell Integration

### Completions

```bash
# Get completions for flag prefix
curl "https://matrix.factory-wager.com/kimi/complete?prefix=--wa"
```

Response:
```json
{
  "prefix": "--wa",
  "completions": [
    { "text": "--watch", "description": "execution - boolean" },
    { "text": "--watchAll", "description": "execution - boolean" },
    { "text": "--watchPath", "description": "execution - string[]" }
  ]
}
```

### Query

```bash
# Query matrix
curl -X POST "https://matrix.factory-wager.com/kimi/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "watch"}'
```

## RSS Integration

### Feed URL

```
https://matrix.factory-wager.com/rss
```

### Feed Categories

- `execution` - Runtime flags
- `filtering` - Test filtering
- `coverage` - Coverage options
- `performance` - Performance tuning
- `ci/cd` - CI/CD options

### Filter by Topic

```
https://matrix.factory-wager.com/rss/execution
https://matrix.factory-wager.com/rss/coverage
```

## MCP Protocol

### Resources

```
test://options/matrix      -> https://matrix.factory-wager.com/mcp/matrix
test://options/validation  -> https://matrix.factory-wager.com/mcp/validation
test://options/flag/{name} -> https://matrix.factory-wager.com/mcp/flag/{name}
```

### Example Usage

```typescript
const client = new MCPClient({
  serverUrl: "https://matrix.factory-wager.com/mcp"
});

const matrix = await client.readResource("test://options/matrix");
```

## WebSocket

### Connect

```javascript
const ws = new WebSocket("wss://matrix.factory-wager.com/ws");

ws.onopen = () => {
  ws.send(JSON.stringify({ action: "subscribe" }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Matrix update:", data);
};
```

### Actions

- `subscribe` - Subscribe to matrix updates
- `search` - Search flags: `{ action: "search", query: "watch" }`

## One-Liners

```bash
source bin/tier1380-oneliners.sh

# Validate Col 105
t1380_validate_col105

# Search flags
t1380_search "watch"

# Check matrix via gateway
curl -s https://matrix.factory-wager.com/validate | jq .
```

## Cloudflare Infrastructure

### Workers

- **Name:** `tier1380-matrix-gateway`
- **Script:** `workers/matrix-rss-gateway.ts`
- **Routes:**
  - `matrix.factory-wager.com/*`
  - `api.factory-wager.com/matrix/*`
  - `rss.factory-wager.com/*`

### R2 Bucket

- **Name:** `fw-matrix-snapshots`
- **Purpose:** Matrix state snapshots

### KV Namespace

- **Name:** `fw_matrix_registry`
- **Purpose:** Matrix metadata

### Queue

- **Name:** `fw-matrix-updates`
- **Purpose:** Matrix update notifications

## Domain Configuration

```yaml
# domain-config.yml
- name: "matrix"
  type: CNAME
  content: "cname.vercel-dns.com"
  proxied: true
  
- name: "rss"
  type: CNAME
  content: "cname.vercel-dns.com"
  proxied: true
```

## Security

- CORS enabled for browser access
- Security headers (CSP, X-Frame-Options)
- Cloudflare DDoS protection
- Rate limiting via Cloudflare

## Monitoring

### Health Check

```bash
curl https://matrix.factory-wager.com/health
```

### Validation

```bash
curl https://matrix.factory-wager.com/validate
```

## Troubleshooting

### Worker Not Responding

```bash
# Check worker status
wrangler status --config workers/wrangler.matrix.toml

# View logs
wrangler tail --config workers/wrangler.matrix.toml
```

### DNS Issues

```bash
# Check DNS propagation
dig matrix.factory-wager.com

# Flush Cloudflare cache
wrangler cache purge
```

## Integration Status

- ✅ Matrix Nexus deployed
- ✅ Cloudflare Worker deployed
- ✅ Domain configured
- ✅ RSS feeds active
- ✅ Kimi shell integrated
- ✅ MCP protocol exposed
- ✅ WebSocket real-time updates
