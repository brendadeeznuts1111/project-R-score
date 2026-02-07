# Theme Portal Build Guide

## Environment Variables

Bun automatically inlines environment variables at build time. Use the `PUBLIC_*` prefix for variables that should be exposed to the browser.

### Development

```bash
# Start dev server with environment variables
PUBLIC_API_URL=https://api.example.com bun index.html

# Or with multiple variables
PUBLIC_API_URL=https://api.example.com \
PUBLIC_ANALYTICS_ID=UA-123456 \
bun index.html
```

### Production Build

```bash
# Build with environment variables
PUBLIC_API_URL=https://api.example.com \
PUBLIC_CDN_URL=https://cdn.example.com \
bun build ./index.html --outdir=dist

# Or using the env flag for pattern matching
bun build ./index.html --outdir=dist --env=PUBLIC_*
```

## Configuration

The `bunfig.toml` is configured to automatically inline `PUBLIC_*` environment variables:

```toml
[serve]
env = "PUBLIC_*"
```

## Usage in Code

```typescript
// These will be replaced with actual values at build time
const apiUrl = process.env.PUBLIC_API_URL;
const cdnUrl = process.env.PUBLIC_CDN_URL;
```

## Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PUBLIC_API_URL` | API endpoint URL | `https://api.factory-wager.com` |
| `PUBLIC_CDN_URL` | CDN base URL | `https://cdn.factory-wager.com` |
| `PUBLIC_ANALYTICS_ID` | Analytics tracking ID | `UA-123456-1` |
| `PUBLIC_APP_VERSION` | App version string | `1.0.0` |

## Build Outputs

After building, the `dist/` folder will contain:

```
dist/
├── index.html          # Optimized HTML
├── index-[hash].js     # Bundled JavaScript
├── index-[hash].css    # Bundled CSS
└── assets/             # Images, fonts, etc.
```

## Deployment

```bash
# Build for production
bun run build

# Deploy dist/ folder to your hosting provider
# Examples:
# - Vercel: vercel --cwd dist
# - Netlify: netlify deploy --dir=dist
# - Cloudflare Pages: wrangler pages publish dist
```
