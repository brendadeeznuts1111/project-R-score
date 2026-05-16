# FactoryWager Enterprise Platform

**Bun-native high-performance workspace** — A comprehensive monorepo for FactoryWager applications, tools, demos, and infrastructure.

## Workspace Overview
This root organizes a large Bun + TypeScript ecosystem including:

- **Core Platforms**: `factorywager/`, `barbershop/`, `kimiremote/`, `peer/`
- **Categorized Projects**: `projects/` (apps, enterprise, games, experimental, etc.)
- **Tooling & Scripts**: `scripts/`, `tools/`, `cli/`, `bin/`
- **Shared Code**: `lib/`, `src/`, `utils/`, `packages/`
- **Servers & Services**: `server/`, `services/`, `dashboard/`
- **Documentation**: `docs/` (extensive), `public/` (dashboards, badges)
- **Experiments**: `scratch/` (Bun v1.3.9 playgrounds, benchmarks)
- **Artifacts & Data**: `artifacts/`, `database/`, `logs/`, `data/`

See [ROOT_CLEANUP_SUMMARY.md](./ROOT_CLEANUP_SUMMARY.md) for organization history and [public/badges/README.md](./public/badges/README.md) for status badges.

## Base URL Pattern (Legacy TypedArray Docs)
All typed array documentation follows this pattern:
```
https://bun.sh/docs/runtime/binary-data#typedarray
```

## Quick Start
```bash
# Clone and install
git clone <repo>
cd Projects
bun install

# Start the platform server (see package.json scripts)
bun run dev

# Or explore specific areas:
# bun run start:p2p-proxy
# bun run dashboard
# ./cli/fw-cli --help
```

## Fetch Examples (Bun Native Pattern)
```javascript
// Example 1: Basic fetch (from Bun docs)
const response = await fetch("https://bun.sh/docs/runtime/binary-data#typedarray");
console.log(response.status); // => 200
const text = await response.text();

// Example 2: Fetch JSON data
const urlResponse = await fetch("http://example.com/api/typedarray/urls");
const data = await urlResponse.json();
console.log(data.base); // => "https://bun.sh/docs/runtime/binary-data#typedarray"

// Example 3: Fetch RSS feed
const rssResponse = await fetch("http://example.com/feed/rss");
const rssXml = await rssResponse.text();
```

## Key Commands (from package.json)
- `bun run dev` — Watch server (server/server-enhanced.ts)
- `bun run start:p2p-proxy` — Various P2P/proxy servers
- `bun run dashboard` — MCP overview dashboard
- `bun run deployment:readiness` — Readiness matrix
- `./cli/fw-cli badges generate all` — Generate status badges (now in public/badges/)
- Many more in `package.json` scripts and `scripts/`

## Legacy TypedArray Endpoints
The original documentation portal endpoints (see history in git). For current services, explore `server/`, `services/`, `dashboard/`, and sub-project READMEs.

## Project Policies
- Import boundaries and allowed package roots: `docs/IMPORT_BOUNDARIES.md`
- Root organization: see ROOT_CLEANUP_SUMMARY.md (175+ files organized, ongoing enhancements)
