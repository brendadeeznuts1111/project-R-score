# NEXUS Secrets Management

Manage secrets using Bun.secrets integration.

## [instructions]

Work with Bun 1.3+ secrets management.

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [secrets.api]

```typescript
// Access secrets (read-only, non-enumerable)
const apiKey = Bun.secrets.DERIBIT_API_KEY;
const dbUrl = Bun.secrets.DATABASE_URL;

// Secrets don't appear in:
// - Object.keys(Bun.secrets)
// - JSON.stringify(Bun.secrets)
// - console.log(Bun.secrets)
```

## [migration.from.env]

```bash
# Old way (process.env)
DERIBIT_API_KEY=xxx bun run start

# New way (Bun.secrets)
# Secrets loaded automatically from secure store
bun run start
```

## [supported.secrets]

| Secret | Purpose |
|--------|---------|
| `DERIBIT_API_KEY` | Deribit API access |
| `DERIBIT_API_SECRET` | Deribit signing |
| `REDIS_URL` | Redis connection |
| `DATABASE_URL` | Database connection |

## [security.notes]

- Secrets are non-enumerable (can't be listed)
- Won't leak in logs or serialization
- Loaded from secure environment
- Use `Bun.secrets` over `process.env` for sensitive data

## [code.location]

- Secrets Provider: `src/secrets/provider.ts`
- Migration: `src/secrets/migrate.ts`
