# Cloudflare Workers Deployment

Edge deployment configuration and setup for Fire22 Dashboard.

## Deployment Command

```bash
bun run deploy
```

## Workers Configuration

- Runtime: Bun-compiled JavaScript at the edge
- Database: Cloudflare D1 (SQLite at edge locations)
- Caching: KV storage for session and API cache
- Performance: <Component50ms cold start, global distribution
