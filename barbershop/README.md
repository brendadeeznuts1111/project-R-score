# Barbershop

A Bun-native barbershop demo with real-time dashboard, WebSocket, and R2 integration.

## Quick Start

```bash
bun run start           # Start demo
bun run dev             # Start with hot reload
bun run start:server    # API server with WebSocket
bun run start:dashboard # Dashboard only
bun run test            # Run tests
```

## Configuration

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `HOST` | Bind host | `0.0.0.0` |
| `PORT` | Bind port | `3000` |
| `PUBLIC_BASE_URL` | External URL | `http://localhost:3000` |
| `LIFECYCLE_KEY` | Key for `/ops/lifecycle` | `godmode123` |
| `VECTORIZE_WORKER_URL` | Cloudflare Worker URL for Vectorize | `http://localhost:8787` |
| `VECTORIZE_ENABLED` | Enable Vectorize semantic search | `false` |

R2 configuration via `Bun.secrets` (macOS Keychain):

```bash
bun run setup:r2  # One-time setup
```

### Cloudflare Vectorize Setup

The project includes semantic search capabilities using Cloudflare Vectorize V2 for:
- **Enhanced skill matching** - Semantic barber-ticket matching
- **Natural language barber search** - Find barbers by service queries
- **Customer search** - Semantic search across customer names, preferences, and locations
- **Customer preference matching** - Match customers to barbers based on preferences
- **RAG customer support** - Answer questions using document embeddings

#### Setup Steps

1. **Install Wrangler** (if not already installed):
   ```bash
   npm install -g wrangler@latest
   ```

2. **Create Vectorize indexes**:
   ```bash
   bun run scripts/vectorize/setup-indexes.sh
   ```
   Or manually:
   ```bash
   # Create barbers index
   npx wrangler vectorize create barbershop-barbers-index --dimensions=768 --metric=cosine
   
   # Create metadata indexes (BEFORE inserting vectors!)
   npx wrangler vectorize create-metadata-index barbershop-barbers-index --property-name=barber_id --type=string
   npx wrangler vectorize create-metadata-index barbershop-barbers-index --property-name=status --type=string
   npx wrangler vectorize create-metadata-index barbershop-barbers-index --property-name=skill_type --type=string
   
   # Create docs index
   npx wrangler vectorize create barbershop-docs-index --dimensions=768 --metric=cosine
   
   # Create docs metadata indexes
   npx wrangler vectorize create-metadata-index barbershop-docs-index --property-name=doc_id --type=string
   npx wrangler vectorize create-metadata-index barbershop-docs-index --property-name=section --type=string
   npx wrangler vectorize create-metadata-index barbershop-docs-index --property-name=topic --type=string
   
   # Create customers index
   bunx wrangler vectorize create barbershop-customers-index --dimensions=768 --metric=cosine
   
   # Create customers metadata indexes (BEFORE inserting vectors!)
   bunx wrangler vectorize create-metadata-index barbershop-customers-index --property-name=customer_id --type=string
   bunx wrangler vectorize create-metadata-index barbershop-customers-index --property-name=tier --type=string
   bunx wrangler vectorize create-metadata-index barbershop-customers-index --property-name=preferredBarber --type=string
   bunx wrangler vectorize create-metadata-index barbershop-customers-index --property-name=homeShop --type=string
   ```

3. **Deploy Cloudflare Worker**:
   ```bash
   npx wrangler deploy
   ```

4. **Set environment variables**:
   ```bash
   export VECTORIZE_WORKER_URL="https://your-worker.your-subdomain.workers.dev"
   export VECTORIZE_ENABLED="true"
   ```

5. **Index existing barbers**:
   ```bash
   bun run scripts/vectorize/index-barbers.ts
   ```

6. **Index existing customers**:
   ```bash
   bun run scripts/vectorize/index-customers.ts
   ```

7. **Upload knowledge base to R2** (for AI Search):
   ```bash
   bun run scripts/vectorize/upload-docs-to-r2.ts
   ```

8. **Create AI Search instance** (optional - for automatic knowledge base indexing):
   ```bash
   # Set environment variables first
   export CLOUDFLARE_ACCOUNT_ID="your_account_id"
   export AI_SEARCH_API_TOKEN="your_ai_search_token"
   export R2_KNOWLEDGE_BASE_BUCKET="barbershop-knowledge-base"
   
   # Run setup script
   bun run scripts/vectorize/setup-ai-search.sh
   ```
   
   Or manually via API (with path filtering):
   ```bash
   curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai-search/instances" \
     -H "Authorization: Bearer $AI_SEARCH_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{
       "id": "barbershop-knowledge-base",
       "type": "r2",
       "source": "barbershop-knowledge-base",
       "source_params": {
         "include_items": ["/knowledge-base/**"]
       }
     }'
   ```
   
   **Path Filtering**: The `source_params.include_items` pattern ensures only files in `/knowledge-base/**` are indexed. You can also add `exclude_items` to skip specific files (e.g., `["**/*.tmp", "**/*.bak"]`). 
   
   ⚠️ **Important**: Pattern matching is case-sensitive and matches the full path. The pattern `/knowledge-base/**` matches files like `/knowledge-base/services.md` but not `/Knowledge-Base/services.md` or `/other/knowledge-base/file.md`. See [Path Filtering Important Notes](https://developers.cloudflare.com/ai-search/configuration/path-filtering/#important-notes) for details.

9. **Index knowledge base documents** (fallback - if not using AI Search):
   ```bash
   bun run scripts/vectorize/index-documents.ts
   ```

#### Features

- **Semantic Skill Matching**: Automatically matches tickets to barbers based on service similarity (not just exact string matches)
- **Barber Search**: Natural language queries like "barber who does fades" or "beard specialist"
- **Customer Search**: Semantic search across customer names, preferences, homeShop, and addresses
- **Customer Preference Matching**: Find barbers that match a customer's preferredBarber, homeShop, and tier preferences
- **Customer Support**: RAG-powered support chat that answers questions about services, pricing, and booking
  - Uses **AI Search** for knowledge base (automatic indexing from R2)
  - **Reranking enabled** by default for better result quality
  - Falls back to **Vectorize** if AI Search unavailable

#### Architecture

- **Vectorize**: Used for real-time barber skill matching (custom metadata, dynamic updates)
- **AI Search**: Used for knowledge base documents (automatic R2 indexing, continuous updates)
- **Hybrid Approach**: Best of both worlds - Vectorize for dynamic data, AI Search for static docs

#### Vectorize CLI

A comprehensive CLI tool with Bun.secrets integration is available:

```bash
# Check secrets status
bun run vectorize:secrets:status

# Store credentials securely in Bun.secrets (macOS Keychain)
bun run vectorize:secrets:set-token YOUR_TOKEN
bun run vectorize:secrets:set-account-id YOUR_ACCOUNT_ID

# List indexes
bun run vectorize:indexes:list

# Index data
bun run vectorize:index:barbers
bun run vectorize:index:customers
bun run vectorize:index:all

# Search
bun run vectorize search barbers "fade specialist"
bun run vectorize search customers "VIP customer"

# Full setup
bun run vectorize:setup
```

See [Vectorize CLI Documentation](docs/VECTORIZE_CLI.md) for complete usage.

#### Testing

Run Vectorize tests:
```bash
# Unit tests (no Vectorize required)
bun test tests/unit/vectorize-client.test.ts

# Integration tests (requires Vectorize setup)
VECTORIZE_ENABLED=true VECTORIZE_WORKER_URL="..." bun test tests/integration/vectorize-matching.test.ts
```

## Project Structure

```
barbershop/
├── src/
│   ├── core/        # Main business logic
│   │   ├── barber-server.ts         # API server
│   │   ├── barbershop-dashboard.ts  # 3-view dashboard
│   │   ├── barbershop-tickets.ts    # Ticketing flow
│   │   ├── metrics.ts               # Prometheus metrics
│   │   ├── realtime-dashboard.ts    # WebSocket hub
│   │   ├── fusion-runtime.ts        # Predictive analytics
│   │   ├── edge-router.ts           # Geo routing
│   │   ├── streams.ts               # WebSocket streaming
│   │   ├── wasm-engine.ts           # WASM compute
│   │   └── ui.ts                    # UI components
│   ├── utils/       # Utilities
│   │   ├── security.ts              # Password/token management
│   │   ├── circuit-breaker.ts       # Resilience pattern
│   │   ├── rate-limiter.ts          # Rate limiting
│   │   ├── structured-logger.ts     # Async logging
│   │   ├── config-loader.ts         # Type-safe config
│   │   ├── feature-flags.ts         # A/B testing
│   │   ├── scheduler.ts             # Cron jobs
│   │   └── graphql.ts               # GraphQL schema
│   ├── secrets/     # Secrets management
│   ├── r2/          # R2/cloud storage
│   └── profile/     # Profile management
├── lib/
│   ├── cookie-security.ts  # Cookie handling
│   ├── table-engine.ts     # WASM tables
│   └── cloudflare/         # CF API clients
├── tests/
│   ├── unit/        # Unit tests
│   └── integration/ # Integration tests
├── workers/         # Cloudflare Workers
│   └── vectorize-worker.ts  # Vectorize operations worker
├── scripts/
│   └── vectorize/   # Vectorize setup and indexing scripts
├── docs/
│   └── knowledge-base/  # RAG knowledge base documents
├── demo/            # Demo frontend
└── config/          # Configuration files
```

## Demo Flows

1. Admin dashboard: `http://localhost:3000/admin`
2. Client portal: `http://localhost:3000/client`
3. Barber station: `http://localhost:3000/barber`
4. Create ticket from client → assignment in barber station
5. Complete ticket → updates in admin

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /docs` | Docs index |
| `GET /ops/runtime` | Runtime metrics |
| `GET /ops/r2-status` | R2 mirror status |
| `GET /ops/fetch-check?url=...` | Fetch diagnostics |
| `GET /barber/stats?barberId=...` | Barber stats |
| `GET /api/search/barbers?q=<query>` | Semantic barber search (requires Vectorize) |
| `GET /api/search/customers?q=<query>` | Semantic customer search (requires Vectorize) |
| `POST /api/match/customer-preferences` | Match barbers to customer preferences (requires Vectorize) |
| `POST /api/support/ask` | RAG customer support (requires Vectorize) |

## Bun APIs Used

| API | Use |
|-----|-----|
| `Bun.hash()` | Fast non-crypto hashing (25x faster) |
| `Bun.password` | Argon2id password hashing |
| `Bun.gzip()` | Native compression |
| `Bun.nanoseconds()` | High-res timing |
| `Bun.write()` | Fast file I/O |
| `Bun.serve()` | HTTP/WebSocket server |

## Documentation

| Document | Description |
|----------|-------------|
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md) | Operations guide |
| [`docs/THEMES.md`](docs/THEMES.md) | Theme system |
| [`docs/OPTIMIZATION.md`](docs/OPTIMIZATION.md) | Performance |
| [`AGENTS.md`](AGENTS.md) | AI agent context |

## Development

```bash
bun run lint      # Lint code
bun run fmt       # Format code
bun run typecheck # Type check
bun run build:prod # Production build
```