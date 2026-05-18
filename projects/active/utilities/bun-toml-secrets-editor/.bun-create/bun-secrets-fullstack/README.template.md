# {{APP_NAME}}

{{APP_DESCRIPTION}}

Created from the Golden Template on {{CURRENT_DATE}}.

## Features

- 🔐 **Secrets Management** - Secure storage with CLI/ENV/XDG patterns
- 📰 **RSS Feed Support** - Built-in RSS fetching with authentication
- 🎨 **UI Configuration** - Theme and feature flags
- 🚀 **Bun Native** - Optimized for Bun runtime
- 🐳 **Docker Ready** - Container configuration included

## Quick Start

```bash
# Initialize secrets
bun run secrets:init

# Set your secrets
bun run secrets:set production DB_PASSWORD your-password
bun run secrets:set production API_KEY your-api-key

# Validate configuration
bun run config:validate

# Run development server
bun run dev
```

## Configuration

Edit `config/app.toml` to customize:

- **Database** - Connection settings with secret resolution
- **APIs** - External API configurations
- **RSS Feeds** - Public and authenticated feeds
- **UI** - Themes, colors, and features

## Secrets Management

Secrets are resolved in priority order:
1. CLI flags: `--secrets-dir /path`
2. Environment: `BUN_SECRETS_DIR`
3. XDG spec: `XDG_CONFIG_HOME/bun-secrets`
4. Default: `~/.config/bun-secrets`

```bash
# Set a secret
bun run secrets:set production DATABASE_URL postgres://...

# Use in TOML
[database]
url = "${secrets:production:DATABASE_URL}"
```

## RSS Feeds

```bash
# List configured feeds
bun run rss:feeds

# Fetch specific feed
bun run rss:fetch "Hacker News"
```

## Deployment

### Docker

```bash
bun run docker:build
bun run docker:run
```

### Environment Variables

Set `NODE_ENV` to control profile selection:
- `development` - Uses dev secrets and local services
- `staging` - Uses staging secrets
- `production` - Uses production secrets

## License

MIT
