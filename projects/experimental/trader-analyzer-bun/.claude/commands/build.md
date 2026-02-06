# Build NEXUS for Production

Build static assets and production bundles using Bun's bundler.

## [instructions]

Build the NEXUS project for production deployment:

```bash
cd /Users/nolarose/Projects/trader-analyzer-bun
```

## [commands]

```bash
# Type check first
bun run typecheck

# Build with minification
bun build ./src/index.ts --outdir=dist --minify

# Build with sourcemaps
bun build ./src/index.ts --outdir=dist --minify --sourcemap=external
```

## [html.bundler]

Bun 1.3+ supports HTML as entry points for static sites:

```bash
# Single page app
bun ./public/index.html

# Build for production
bun build ./public/index.html --outdir=dist --minify
```

## [env.inlining]

Inline environment variables at build time:

```bash
# Only PUBLIC_* vars (recommended)
bun build ./index.html --outdir=dist --env=PUBLIC_*

# All env vars
bun build ./index.html --outdir=dist --env=inline
```

## [watch.mode]

Watch for changes and rebuild:

```bash
bun build ./src/index.ts --outdir=dist --watch
```

## [bundler.options]

| Option | Description |
|--------|-------------|
| `--minify` | Minify output |
| `--sourcemap` | Generate sourcemaps |
| `--outdir` | Output directory |
| `--target` | `browser`, `bun`, `node` |
| `--splitting` | Enable code splitting |

## [production.checklist]

1. Run `bun run typecheck`
2. Run `bun test`
3. Build with `--minify`
4. Use `--disable-eval` runtime flag
5. Set `NODE_ENV=production`
