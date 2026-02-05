# Environment Variable Setup Guide

This guide explains how to set up and manage environment variables for the
Dashboard Worker project, which supports both local development with Bun and
production deployment with Cloudflare Workers.

## 🚀 Quick Start

1. **Copy the example environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Fill in your environment variables in `.env`**

3. **Validate your configuration:**
   ```bash
   bun run env:validate
   ```

## 📁 Environment Files

The project supports multiple environment files for different contexts:

- **`.env`** - Default environment variables (loaded in all environments)
- **`.env.local`** - Local overrides (not loaded in test mode)
- **`.env.development`** - Development-specific variables
- **`.env.production`** - Production-specific variables
- **`.env.test`** - Test-specific variables

### File Loading Priority (highest to lowest):

1. Command line variables
2. `.env.local` (except in test mode)
3. `.env.[NODE_ENV]` (e.g., `.env.development`)
4. `.env`
5. `wrangler.toml` (for Cloudflare Workers)

## 🔧 Environment Variables

### Required Variables

These variables must be set for the application to function:

```bash
# Authentication
JWT_SECRET=your_super_secret_jwt_key_change_in_production
ADMIN_PASSWORD=admin123

# Payment Gateway (Stripe)
STRIPE_SECRET_KEY=sk_test_your_stripe_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Communication Services
SENDGRID_API_KEY=your_sendgrid_key_here
TWILIO_ACCOUNT_SID=your_twilio_sid_here
TWILIO_AUTH_TOKEN=your_twilio_token_here

# System Configuration
CRON_SECRET=your_super_secret_cron_key_change_in_production
```

### Optional Variables

```bash
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token_here
CASHIER_BOT_TOKEN=your_cashier_bot_token_here

# Fire22 Integration
FIRE22_API_URL=https://api.fire22.com
FIRE22_TOKEN=your_fire22_api_token_here
FIRE22_WEBHOOK_SECRET=your_webhook_secret_here

# Development Settings
NODE_ENV=development
BUN_CONFIG_VERBOSE_FETCH=0
BUN_CONFIG_MAX_HTTP_REQUESTS=256
```

## 🛠️ Management Commands

The project includes several CLI commands for managing environment variables:

### Validate Configuration

```bash
bun run env:validate
```

Checks that all required environment variables are set and validates their
format.

### List Environment Variables

```bash
bun run env:list
```

Lists all current environment variables (sensitive values are masked).

### Check Environment Status

```bash
bun run env:check
```

Shows detailed information about the current environment setup.

### Get Help

```bash
bun run env:help
```

Displays usage information for all environment management commands.

## 🔒 Security Best Practices

### 1. Never Commit Secrets

- Add `.env*` files to `.gitignore`
- Use `.env.example` for documentation
- Store production secrets in Cloudflare Workers secrets

### 2. Use Strong Secrets

- JWT_SECRET: At least 32 characters
- API keys: Use the full key provided by the service
- Passwords: Use strong, unique passwords

### 3. Environment-Specific Values

- Use different API keys for development and production
- Use test databases for development
- Use sandbox/staging environments for testing

## 🌍 Environment-Specific Configuration

### Development

```bash
NODE_ENV=development
BUN_CONFIG_VERBOSE_FETCH=1
BUN_CONFIG_MAX_HTTP_REQUESTS=128
```

### Production

```bash
NODE_ENV=production
BUN_CONFIG_VERBOSE_FETCH=0
BUN_CONFIG_MAX_HTTP_REQUESTS=256
```

### Testing

```bash
NODE_ENV=test
BUN_CONFIG_VERBOSE_FETCH=0
BUN_CONFIG_MAX_HTTP_REQUESTS=64
```

## 🔄 Variable Expansion

Bun automatically expands environment variables in `.env` files:

```bash
# Base variables
DB_USER=postgres
DB_PASSWORD=secret
DB_HOST=localhost
DB_PORT=5432

# Expanded variable
DB_URL=postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/mydb
```

To disable expansion, escape the `$`:

```bash
PRICE=$19.99  # Will expand to: 19.99
PRICE=\$19.99 # Will remain: $19.99
```

## 🚀 Cloudflare Workers Integration

When deploying to Cloudflare Workers:

1. **Environment variables** are loaded from `wrangler.toml`
2. **Secrets** are managed via `wrangler secret put`
3. **Database bindings** are configured in `wrangler.toml`

### Setting Secrets

```bash
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put ADMIN_PASSWORD
```

### Environment Variables in wrangler.toml

```toml
[vars]
NODE_ENV = "production"
FIRE22_API_URL = "https://api.fire22.com"
```

## 🧪 Testing Environment

During testing (`NODE_ENV=test`):

- `.env.local` is **not loaded** (ensures consistent test environments)
- Use `.env.test` for test-specific variables
- Consider using a separate test database
- Mock external services when possible

## 🔍 Troubleshooting

### Common Issues

1. **"Required environment variable X is not set"**

   - Check that the variable is defined in your `.env` file
   - Verify the variable name matches exactly (case-sensitive)
   - Ensure the `.env` file is in the project root

2. **Variables not loading**

   - Check file permissions on `.env` files
   - Verify `NODE_ENV` is set correctly
   - Restart your development server

3. **TypeScript errors**
   - Ensure `@types/bun` is installed
   - Check that `tsconfig.json` includes Bun types
   - Restart your TypeScript language server

### Debug Commands

```bash
# Check environment status
bun run env:check

# List all variables
bun run env:list

# Validate configuration
bun run env:validate

# Print environment variables (Bun built-in)
bun --print process.env
```

## 📚 Additional Resources

- [Bun Environment Variables Documentation](https://bun.com/docs/runtime/environment-variables)
- [Cloudflare Workers Environment Variables](https://developers.cloudflare.com/workers/platform/environment-variables/)
- [Environment Variable Best Practices](https://12factor.net/config)

## 🤝 Contributing

When adding new environment variables:

1. Add them to the `Env` interface in `src/index.ts`
2. Update the configuration in `src/config.ts`
3. Add them to `.env.example`
4. Update this documentation
5. Add validation rules if needed

## 📝 Changelog

- **v1.0.0** - Initial environment variable setup
- Added Bun interface merging for TypeScript support
- Created environment management CLI tools
- Added comprehensive validation and error handling
