# Cloudflare Domain Management CLI

A comprehensive CLI for managing FactoryWager domains via the Cloudflare API. Built with Bun-native fetch for optimal performance. Now integrated with **Bun.secrets** for secure credential management.

## Features

- 🌐 **Zone Management** - List, create, and delete Cloudflare zones
- 📝 **DNS Records** - Manage A, AAAA, CNAME, MX, TXT, and other record types
- 🔒 **SSL/TLS** - Check and configure SSL modes (off/flexible/full/strict)
- 🧹 **Cache Management** - Purge all cache or specific files
- 📊 **Analytics** - View traffic, bandwidth, and threat statistics
- 🏭 **FactoryWager Setup** - Automated setup of all subdomains
- 🔐 **Bun.secrets Integration** - Secure credential storage with versioning

## Quick Start

### Option 1: Using Bun.secrets (Recommended)

```bash
# Store credentials securely
bun run cf:secrets:setup <api_token> [account_id]

# Or set individually
bun run cf:secrets:set-token <api_token>
bun run cf:secrets:set-account <account_id>

# Verify setup
bun run cf:secrets:status
```

### Option 2: Using Environment Variables

```bash
# .env file
CLOUDFLARE_API_TOKEN=your_api_token
CLOUDFLARE_ACCOUNT_ID=your_account_id  # Optional, required for zone creation
```

### 3. Verify Connection

```bash
bun run domain:verify
```

### 4. Setup FactoryWager Domains

```bash
bun run domain:setup
```

## Authentication Priority

The CLI checks credentials in this order:

1. **Bun.secrets** - Secure, versioned storage (recommended)
2. **Environment variables** - `.env` file or shell

Get your API token from [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) with these permissions:
- `Zone:Read` - List and view zones
- `Zone:Edit` - Create/delete zones
- `DNS:Read` - List DNS records
- `DNS:Edit` - Modify DNS records
- `Cache:Purge` - Purge cache

## Commands

### Zone Management

```bash
# List all zones
bun run scripts/domain/cf-domain-cli.ts zones list

# Filter zones by domain
bun run scripts/domain/cf-domain-cli.ts zones list factory-wager

# Get zone details
bun run scripts/domain/cf-domain-cli.ts zones get factory-wager.com

# Create new zone
bun run scripts/domain/cf-domain-cli.ts zones create example.com

# Delete zone (with confirmation)
bun run scripts/domain/cf-domain-cli.ts zones delete example.com

# Delete without confirmation
bun run scripts/domain/cf-domain-cli.ts zones delete example.com --force
```

### DNS Records

```bash
# List all DNS records
bun run scripts/domain/cf-domain-cli.ts dns list factory-wager.com

# Filter by type
bun run scripts/domain/cf-domain-cli.ts dns list factory-wager.com CNAME

# Add A record
bun run scripts/domain/cf-domain-cli.ts dns add factory-wager.com A api 1.2.3.4

# Add CNAME record (proxied through Cloudflare)
bun run scripts/domain/cf-domain-cli.ts dns add factory-wager.com CNAME app factory-wager.com

# Add TXT record
bun run scripts/domain/cf-domain-cli.ts dns add factory-wager.com TXT _acme-challenge "verification-token"

# Delete DNS record
bun run scripts/domain/cf-domain-cli.ts dns delete factory-wager.com <record-id>
```

### SSL/TLS Configuration

```bash
# Check SSL status
bun run scripts/domain/cf-domain-cli.ts ssl status factory-wager.com

# Set SSL mode (off/flexible/full/strict)
bun run scripts/domain/cf-domain-cli.ts ssl set factory-wager.com strict
```

### Cache Management

```bash
# Purge all cache
bun run scripts/domain/cf-domain-cli.ts cache purge factory-wager.com

# Purge specific files
bun run scripts/domain/cf-domain-cli.ts cache purge-files factory-wager.com \
  https://factory-wager.com/page1 \
  https://factory-wager.com/page2
```

### Analytics

```bash
# Show last 7 days (default)
bun run scripts/domain/cf-domain-cli.ts analytics factory-wager.com

# Show last 30 days
bun run scripts/domain/cf-domain-cli.ts analytics factory-wager.com 30
```

### FactoryWager Domain Setup

Automatically configures all FactoryWager subdomains:

```bash
# Production setup
bun run domain:setup

# Staging environment
bun run scripts/domain/cf-domain-cli.ts setup factory-wager staging

# Development environment
bun run scripts/domain/cf-domain-cli.ts setup factory-wager development
```

This creates the following DNS records:
- `docs.factory-wager.com` → `factory-wager.com`
- `api.factory-wager.com` → `factory-wager.com`
- `app.factory-wager.com` → `factory-wager.com`
- `cdn.factory-wager.com` → `factory-wager.com`
- `ws.factory-wager.com` → `factory-wager.com`
- `matrix.factory-wager.com` → `factory-wager.com`
- `registry.factory-wager.com` → `factory-wager.com`

All records are proxied through Cloudflare (orange cloud) for DDoS protection and caching.

## Secrets Management Commands

```bash
# Check credentials status
bun run cf:secrets:status

# Store API token
bun run cf:secrets:set-token <token>

# Store Account ID
bun run cf:secrets:set-account <account-id>

# Configure both at once
bun run cf:secrets:setup <token> [account-id]

# View version history (requires integrated secrets)
bun run cf:secrets:history [limit]

# Schedule automatic rotation
bun run cf:secrets:schedule "0 2 * * 0"

# Manual rotation (prints steps)
bun run cf:secrets:rotate
```

## Package.json Scripts

```json
{
  "domain:zones": "bun run scripts/domain/cf-domain-cli.ts zones",
  "domain:dns": "bun run scripts/domain/cf-domain-cli.ts dns",
  "domain:ssl": "bun run scripts/domain/cf-domain-cli.ts ssl",
  "domain:cache": "bun run scripts/domain/cf-domain-cli.ts cache",
  "domain:analytics": "bun run scripts/domain/cf-domain-cli.ts analytics",
  "domain:setup": "bun run scripts/domain/cf-domain-cli.ts setup factory-wager",
  "domain:verify": "bun run scripts/domain/cf-domain-cli.ts verify",
  "cf:secrets:status": "bun run scripts/domain/cf-secrets-bridge.ts status",
  "cf:secrets:setup": "bun run scripts/domain/cf-secrets-bridge.ts setup",
  "cf:secrets:set-token": "bun run scripts/domain/cf-secrets-bridge.ts set-token",
  "cf:secrets:set-account": "bun run scripts/domain/cf-secrets-bridge.ts set-account",
  "cf:secrets:history": "bun run scripts/domain/cf-secrets-bridge.ts history",
  "cf:secrets:rotate": "bun run scripts/domain/cf-secrets-bridge.ts rotate",
  "cf:secrets:schedule": "bun run scripts/domain/cf-secrets-bridge.ts schedule"
}
```

## Examples

### Complete Workflow

```bash
# 1. Verify API access
bun run domain:verify

# 2. Check current zones
bun run domain:zones list

# 3. Setup FactoryWager domains
bun run domain:setup

# 4. Verify DNS records
bun run domain:dns list factory-wager.com

# 5. Check SSL is enabled
bun run domain:ssl status factory-wager.com

# 6. Purge cache after deployment
bun run domain:cache purge factory-wager.com
```

### Theme Integration

The domain CLI integrates with FactoryWager's theme system for styled output:

```bash
# Use professional theme (default)
bun run cf:themed status

# Use dark theme
bun run cf:themed:dark zones

# Use light theme  
bun run cf:themed:light dns factory-wager.com
```

### Theme Configuration

Domain-specific theme settings are in `themes/config/domain.toml`:

```toml
[cli.theme]
default = "professional"
use_icons = true
use_colors = true
border_style = "rounded"

[cli.colors.status]
active = "colors.success.500"
pending = "colors.warning.500"
error = "colors.error.500"
```

### Using Themed Console in Code

```typescript
import { ThemedConsole, getDomainTheme } from './themes/config/domain-theme';

const console = new ThemedConsole('professional');

console.success('Operation completed');
console.error('Something went wrong');
console.info('Status update');
console.warning('Proceed with caution');

// Themed status indicators
const status = console.zoneStatus('active');  // Green "active"
const type = console.dnsType('CNAME');        // Blue "CNAME"
const ssl = console.sslMode('strict');        // Green "strict"
```

## Programmatic Usage

```typescript
import { CloudflareClient, createClientFromEnv } from './lib/cloudflare';

const client = createClientFromEnv();

// List zones
const zones = await client.listZones();

// Create DNS record
const zoneId = await client.getZoneId('factory-wager.com');
const record = await client.createDNSRecord(zoneId, {
  type: 'A',
  name: 'api.factory-wager.com',
  content: '192.0.2.1',
  ttl: 1,  // Auto
  proxied: true,
});

// Purge cache
await client.purgeAllCache(zoneId);
```

## Performance

The CLI uses Bun-native fetch with:
- Automatic rate limiting (20 req/sec max)
- Request/response compression for large payloads
- Automatic retries on transient failures
- Keep-alive connections for multiple operations

## Troubleshooting

### "CLOUDFLARE_API_TOKEN environment variable not set"

```bash
export CLOUDFLARE_API_TOKEN=your_token_here
# OR use Bun.secrets:
bun run cf:secrets:setup <token>
```

### "Zone not found"

The domain must be added to your Cloudflare account first:
```bash
bun run scripts/domain/cf-domain-cli.ts zones create example.com
```

### "Authentication error"

Verify your API token has the required permissions in Cloudflare Dashboard.

### Rate limiting

The CLI automatically handles rate limiting with exponential backoff. If you hit limits frequently:
- Wait a few minutes between bulk operations
- Use `--force` flag to skip confirmations in scripts

## Security Notes

- Store credentials in Bun.secrets (recommended) or `.env` file
- Use tokens with minimal required permissions
- Rotate tokens regularly (`bun run cf:secrets:rotate`)
- Enable IP restrictions on tokens in production
