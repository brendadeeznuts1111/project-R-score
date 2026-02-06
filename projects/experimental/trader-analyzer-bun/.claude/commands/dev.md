# Start NEXUS Development Server

Start the dev server with Bun's Hot Module Replacement.

## [instructions]

Start the NEXUS development server:

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [commands]

```bash
# Start with HMR
bun run dev

# Or directly
bun --hot run src/index.ts
```

## [endpoints.verify]

```bash
# Health check
curl -s http://localhost:3001/api/health | jq .

# Showcase UI
open http://localhost:3001/showcase
```

## [hmr.notes]

- `--hot` enables Hot Module Replacement
- Changes to `src/` auto-reload without restart
- State preserved where possible
- No bundler required

## [troubleshooting]

```bash
# Kill stale processes
lsof -ti :3001 | xargs kill -9

# Check port usage
lsof -i :3001
```
