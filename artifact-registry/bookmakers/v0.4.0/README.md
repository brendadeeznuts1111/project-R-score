# Bookmakers v0.4.0 — public / ops split

| Path | Audience | Pages? |
|------|----------|--------|
| `public/books.json` | Portal mirror SSOT | yes → `public/registry/bookmakers.json` |
| `ops/books.json` | Operator desk (keys, balance placeholders) | **never** |

Regenerate: `bun run bookmakers:migrate`

Rules:
- `id === slug` (route primary key)
- regions: `{ country, stateCode? }` objects
- public must not contain `restBaseUrl`, `apiKeyEnv`, `envVars`, `balance`, `health`
