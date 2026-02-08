# Vectorize CLI Documentation

Comprehensive command-line interface for Cloudflare Vectorize operations with Bun.secrets integration.

## Installation

The CLI is available as a Bun script:

```bash
bun run cli/vectorize-cli.ts <command>
```

Or compile to executable:

```bash
bun build --compile --minify ./cli/vectorize-cli.ts --outfile vectorize
./vectorize <command>
```

## Secrets Management

### Store API Token

Store your Cloudflare API token securely in Bun.secrets (macOS Keychain):

```bash
bun run cli/vectorize-cli.ts secrets set-token YOUR_TOKEN_HERE
```

### Store Account ID

```bash
bun run cli/vectorize-cli.ts secrets set-account-id YOUR_ACCOUNT_ID
```

### Check Secrets Status

```bash
bun run cli/vectorize-cli.ts secrets status
```

This shows:
- ✅ API Token status (found/not found)
- ✅ Account ID status
- ✅ Vectorize availability

### Get Secrets

```bash
# Get token
bun run cli/vectorize-cli.ts secrets get-token

# Get account ID
bun run cli/vectorize-cli.ts secrets get-account-id
```

### Delete Secrets

```bash
# Delete token
bun run cli/vectorize-cli.ts secrets delete-token

# Delete account ID
bun run cli/vectorize-cli.ts secrets delete-account-id
```

### Migrate Secrets

If you have secrets stored under the old service name (`cloudflare`), migrate them to the new UTI format (`com.barbershop.vectorize`):

```bash
bun run cli/vectorize-cli.ts secrets migrate
```

This command:
- Copies secrets from old location to new location
- Preserves old secrets for backward compatibility
- Skips secrets that are already migrated
- Shows clear progress messages

## Index Management

### List All Indexes

```bash
bun run cli/vectorize-cli.ts indexes list
```

### Create Index

```bash
bun run cli/vectorize-cli.ts indexes create barbershop-barbers-index
```

### Delete Index

```bash
bun run cli/vectorize-cli.ts indexes delete barbershop-barbers-index
```

### Get Index Info

```bash
bun run cli/vectorize-cli.ts indexes info barbershop-barbers-index
```

## Metadata Indexes

### Create Metadata Index

```bash
bun run cli/vectorize-cli.ts metadata create barbershop-barbers-index barber_id string
bun run cli/vectorize-cli.ts metadata create barbershop-barbers-index status string
```

### List Metadata Indexes

```bash
bun run cli/vectorize-cli.ts metadata list barbershop-barbers-index
```

## Indexing Operations

### Index Barbers

Index all barbers from the database:

```bash
bun run cli/vectorize-cli.ts index barbers
```

Options:
- `--db-path <path>` - Database path (default: ./barbershop.db)

### Index Customers

```bash
bun run cli/vectorize-cli.ts index customers
```

### Index Documents

```bash
bun run cli/vectorize-cli.ts index documents
```

### Index All

Index barbers, customers, and documents:

```bash
bun run cli/vectorize-cli.ts index all
```

## Search Operations

### Search Barbers

```bash
bun run cli/vectorize-cli.ts search barbers "fade specialist"
bun run cli/vectorize-cli.ts search barbers "beard trim expert" --limit 5
```

### Search Customers

```bash
bun run cli/vectorize-cli.ts search customers "VIP customer downtown"
```

### Search Documents

```bash
bun run cli/vectorize-cli.ts search docs "how much does a haircut cost"
```

## Matching Operations

### Match Customer Preferences

Find barbers that match a customer's preferences:

```bash
bun run cli/vectorize-cli.ts match customer cust_001
```

This uses:
- Customer's preferredBarber
- Customer's homeShop
- Customer's tier
- Semantic similarity

## Setup Operations

### Full Setup

Create all indexes and metadata indexes:

```bash
bun run cli/vectorize-cli.ts setup
```

This creates:
- `barbershop-barbers-index` with metadata indexes
- `barbershop-docs-index` with metadata indexes
- `barbershop-customers-index` with metadata indexes

### Setup Indexes Only

```bash
bun run cli/vectorize-cli.ts setup-indexes
```

## Bun.secrets Integration

The CLI automatically uses Bun.secrets for secure credential storage:

1. **macOS**: Uses Keychain Services
2. **Linux**: Uses libsecret (GNOME Keyring, KWallet)
3. **Windows**: Uses Windows Credential Manager

### How It Works

1. Secrets are stored with service `com.barbershop.vectorize` (UTI format, following [Bun.secrets best practices](https://bun.com/docs/runtime/secrets#best-practices)) and names:
   - `api_token` → `com.barbershop.vectorize:api_token`
   - `account_id` → `com.barbershop.vectorize:account_id`

2. **Backward Compatibility**: The CLI automatically checks for secrets stored under the old `cloudflare` service name and falls back to them if the new location doesn't exist.

3. Fallback to environment variables if Bun.secrets unavailable:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

4. The vectorize-client automatically loads from Bun.secrets or environment

### Service Name Format

Following Bun.secrets best practices, we use a UTI (Uniform Type Identifier) format:
- ✅ **Good**: `com.barbershop.vectorize` (descriptive, avoids conflicts)
- ❌ **Avoid**: `cloudflare` (too generic, could conflict with other tools)

See: [Bun.secrets Best Practices](https://bun.com/docs/runtime/secrets#best-practices)

### Security Benefits

- ✅ Credentials stored securely in OS keychain
- ✅ No plaintext tokens in .env files
- ✅ Automatic fallback to environment variables
- ✅ Works across different platforms

## Examples

### Complete Setup Flow

```bash
# 1. Store credentials
bun run cli/vectorize-cli.ts secrets set-token YOUR_TOKEN
bun run cli/vectorize-cli.ts secrets set-account-id YOUR_ACCOUNT_ID

# 2. Migrate old secrets (if upgrading from previous version)
bun run cli/vectorize-cli.ts secrets migrate

# 3. Verify secrets
bun run cli/vectorize-cli.ts secrets status

# 4. Create indexes
bun run cli/vectorize-cli.ts setup

# 5. Index existing data
bun run cli/vectorize-cli.ts index all

# 6. Test search
bun run cli/vectorize-cli.ts search barbers "fade specialist"
```

### Daily Operations

```bash
# Search for barbers
bun run cli/vectorize-cli.ts search barbers "beard trim"

# Match customer to barbers
bun run cli/vectorize-cli.ts match customer cust_001

# Re-index after updates
bun run cli/vectorize-cli.ts index barbers
```

## Environment Variables

The CLI respects these environment variables:

- `VECTORIZE_WORKER_URL` - Worker URL (default: http://localhost:8787)
- `VECTORIZE_ENABLED` - Enable Vectorize (default: false)
- `DB_PATH` - Database path (default: ./barbershop.db)

## Error Handling

- ✅ Graceful fallback if Bun.secrets unavailable
- ✅ Clear error messages with suggestions
- ✅ Non-zero exit codes on failure
- ✅ Verbose mode with `--verbose` flag

## Integration with vectorize-client

The `vectorize-client.ts` automatically loads credentials from Bun.secrets, so your application code doesn't need to change:

```typescript
import { vectorizeClient } from './vectorize-client';

// Automatically uses Bun.secrets or environment variables
const matches = await vectorizeClient.queryBarbers('fade specialist');
```

## Troubleshooting

### Token Not Found

```bash
# Check status
bun run cli/vectorize-cli.ts secrets status

# Set token
bun run cli/vectorize-cli.ts secrets set-token YOUR_TOKEN
```

### Vectorize Not Available

1. Check `VECTORIZE_WORKER_URL` is set
2. Check `VECTORIZE_ENABLED=true`
3. Verify worker is deployed: `bunx wrangler deploy`

### Bun.secrets Not Working

The CLI automatically falls back to environment variables. Check:
- `.env` file has `CLOUDFLARE_API_TOKEN`
- Environment variables are loaded
- Fallback works seamlessly

### Reporting Issues

If you encounter issues with Bun.secrets or have suggestions for improvement, you can provide feedback directly to the Bun team:

```bash
# Provide feedback about Bun.secrets
bun feedback "Bun.secrets API works great with Vectorize CLI!"

# Report an issue with details
bun feedback --email your@email.com "Issue with Bun.secrets.get() returning null when secret exists"

# Send feedback from a file
bun feedback issue-report.txt
```

**Before reporting:**
1. Try upgrading Bun: `bun upgrade` or `bun upgrade --canary`
2. Check [existing issues](https://github.com/oven-sh/bun/issues)
3. Join [Discord](https://bun.com/discord) for general questions

See: [Bun Feedback Documentation](https://bun.com/docs/feedback)
