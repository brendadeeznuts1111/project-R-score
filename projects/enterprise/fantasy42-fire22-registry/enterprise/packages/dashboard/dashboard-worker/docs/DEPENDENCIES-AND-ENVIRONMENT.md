# 📦 Fire22 Dependencies and Environment Configuration

## 🎯 Overview

Complete documentation of all dependencies, development profiles, and
environment configurations for the Fire22 Dashboard Worker system.

---

## 📚 Dependencies Matrix

### Core Dependencies (Production)

```json
{
  "@cloudflare/workers-types": "^4.20250807.0", // Cloudflare Workers TypeScript types
  "jsonwebtoken": "9.0.2", // JWT authentication
  "drizzle-orm": "^0.29.0", // SQL ORM for database operations
  "better-sqlite3": "^9.2.2", // SQLite database driver
  "zod": "^3.22.4", // Runtime type validation
  "node-fetch": "^3.3.2", // HTTP fetch for Node.js compatibility
  "twilio": "^4.19.0", // SMS/Voice communications
  "stripe": "^14.1.0", // Payment processing
  "@sendgrid/mail": "^8.0.0", // Email service
  "crypto-js": "^4.2.0", // Cryptographic functions
  "date-fns": "^3.0.6", // Date manipulation
  "chalk": "^5.3.0", // Terminal colors
  "kleur": "^4.1.5", // Terminal colors (lightweight)
  "ansi-colors": "^4.1.3" // ANSI color codes
}
```

### Development Dependencies

```json
{
  "@types/bun": "^1.2.21", // Bun TypeScript types
  "@types/jsonwebtoken": "^9.0.10", // JWT types
  "@types/better-sqlite3": "^7.6.8", // SQLite types
  "@types/node": "^20.0.0", // Node.js types
  "typescript": "5.9.2", // TypeScript compiler
  "wrangler": "^3.0.0", // Cloudflare Workers CLI
  "drizzle-kit": "^0.20.9", // Database migrations
  "prettier": "^3.1.1", // Code formatter
  "eslint": "^8.56.0", // Linter
  "eslint-config-prettier": "^9.1.0", // ESLint Prettier integration
  "eslint-plugin-prettier": "^5.1.2", // Prettier as ESLint rule
  "@typescript-eslint/eslint-plugin": "^6.15.0", // TypeScript ESLint rules
  "@typescript-eslint/parser": "^6.15.0" // TypeScript ESLint parser
}
```

### Optional Dependencies

```json
{
  "dotenv": "^16.3.1", // Environment variable loading
  "sqlite3": "^5.1.6", // Alternative SQLite driver
  "redis": "^4.6.0", // Redis client
  "ioredis": "^5.3.0" // Advanced Redis client
}
```

### Workspace Dependencies

#### Dependency Hierarchy

```
@fire22/pattern-system (Zero dependencies - Foundation)
    ↓
@fire22/api-client
    → @fire22/core-dashboard
    ↓
@fire22/core-dashboard
    → @fire22/pattern-system
    → @fire22/api-client
    ↓
@fire22/sports-betting
    → @fire22/api-client
    → @fire22/core-dashboard
    ↓
@fire22/telegram-integration
    → @fire22/api-client
    ↓
@fire22/build-system
    → mitata (benchmarking)
    → typescript
    → @types/bun
```

---

## 🌍 Environment Configuration

### Environment Files Structure

```
dashboard-worker/
├── .env                      # Local development (git ignored)
├── .env.example             # Template with all variables
├── .env.development         # Development environment
├── .env.staging            # Staging environment
├── .env.production         # Production environment
├── .env.production.secure  # Production with encrypted secrets
└── .env.test               # Testing environment
```

### Environment Variables

#### 🔐 Required Secrets

```bash
# Authentication & Security
JWT_SECRET=<minimum-32-chars>              # JWT signing key
ADMIN_PASSWORD=<strong-password>           # Admin access
CRON_SECRET=<random-string>               # Cron job authentication

# Payment Processing
STRIPE_SECRET_KEY=sk_live_xxx             # Stripe API key
STRIPE_WEBHOOK_SECRET=whsec_xxx           # Stripe webhook verification

# Fire22 Integration
FIRE22_API_URL=https://api.fire22.com     # Fire22 API endpoint
FIRE22_TOKEN=<api-token>                  # Fire22 API authentication
FIRE22_WEBHOOK_SECRET=<webhook-secret>    # Fire22 webhook verification
```

#### 📱 Optional Services

```bash
# Telegram Bots
BOT_TOKEN=<telegram-bot-token>            # Main bot
CASHIER_BOT_TOKEN=<cashier-bot-token>     # Cashier bot

# Communication Services
SENDGRID_API_KEY=<sendgrid-key>          # Email service
TWILIO_ACCOUNT_SID=<twilio-sid>          # SMS account
TWILIO_AUTH_TOKEN=<twilio-token>         # SMS authentication

# Development
DEMO_MODE=true|false                      # Enable demo features
```

#### 🔧 System Configuration

```bash
# Runtime Environment
NODE_ENV=development|staging|production|test|demo
ENVIRONMENT=development|staging|production|test|demo

# Bun Configuration
BUN_CONFIG_VERBOSE_FETCH=0               # Fetch logging level
BUN_CONFIG_MAX_HTTP_REQUESTS=256         # Max concurrent requests
BUN_CONFIG_REGISTRY=https://registry.npmjs.org/

# Performance
LOG_LEVEL=debug|info|warn|error          # Logging verbosity
CACHE_TTL=900                             # Cache duration (seconds)
PORT=3000                                 # Server port
```

---

## 👤 Development Profiles

### 1. Development Profile

```typescript
{
  environment: "development",
  features: {
    debugging: true,
    hotReload: true,
    verboseLogging: true,
    mockData: true,
    errorDetails: true
  },
  performance: {
    caching: false,
    minification: false,
    sourceMaps: true,
    bundleAnalysis: true
  },
  security: {
    cors: ["http://localhost:*"],
    strictMode: false,
    rateLimit: 1000
  }
}
```

### 2. Staging Profile

```typescript
{
  environment: "staging",
  features: {
    debugging: false,
    hotReload: false,
    verboseLogging: true,
    mockData: false,
    errorDetails: true
  },
  performance: {
    caching: true,
    minification: false,
    sourceMaps: true,
    bundleAnalysis: false
  },
  security: {
    cors: ["https://staging.fire22.com"],
    strictMode: true,
    rateLimit: 100
  }
}
```

### 3. Production Profile

```typescript
{
  environment: "production",
  features: {
    debugging: false,
    hotReload: false,
    verboseLogging: false,
    mockData: false,
    errorDetails: false
  },
  performance: {
    caching: true,
    minification: true,
    sourceMaps: false,
    bundleAnalysis: false
  },
  security: {
    cors: ["https://fire22.com", "https://dashboard.fire22.com"],
    strictMode: true,
    rateLimit: 100
  }
}
```

### 4. Demo Profile

```typescript
{
  environment: "demo",
  features: {
    debugging: true,
    hotReload: false,
    verboseLogging: true,
    mockData: true,
    errorDetails: false,
    demoMode: true
  },
  performance: {
    caching: true,
    minification: false,
    sourceMaps: false,
    bundleAnalysis: false
  },
  security: {
    cors: ["https://demo.fire22.com"],
    strictMode: false,
    rateLimit: 50
  }
}
```

---

## 🚀 Build Configurations

### Build-time Constants

```typescript
// Injected via --define flags during build
declare const ENVIRONMENT: string;
declare const DEBUG_MODE: boolean;
declare const LOG_LEVEL: string;
declare const API_URL: string;
declare const VERSION: string;
declare const BUILD_TIME: string;
declare const BUILD_NUMBER: number;
declare const COMMIT_HASH: string;
```

### Build Profiles

#### Development Build

```bash
bun build ./src/index.ts \
  --compile \
  --outfile=./dist/fire22-dev \
  --define ENVIRONMENT='"development"' \
  --define DEBUG_MODE='true' \
  --define LOG_LEVEL='"debug"' \
  --define API_URL='"http://localhost:3000"'
```

#### Production Build

```bash
bun build ./src/index.ts \
  --compile \
  --outfile=./dist/fire22-production \
  --define ENVIRONMENT='"production"' \
  --define DEBUG_MODE='false' \
  --define LOG_LEVEL='"warn"' \
  --define API_URL='"https://api.fire22.com"' \
  --minify \
  --sourcemap \
  --bytecode
```

---

## 📊 Dependency Analysis

### Size Impact

```
Production Dependencies:    ~45MB
Development Dependencies:   ~120MB
Optional Dependencies:      ~25MB
Total Install Size:        ~190MB

After SMOL Optimization:
Workspace Bundles:         364KB (99.4% reduction)
```

### Security Audit

```bash
# Run security audit
bun audit

# Check for vulnerabilities
bun audit --fix

# Verify trusted dependencies
bun pm trust verify
```

### Version Management

```bash
# Check outdated packages
bun outdated

# Update all dependencies
bun update

# Update specific workspace
cd workspaces/@fire22-api-client
bun update
```

---

## 🔄 Environment Switching

### Quick Switch Commands

```bash
# Development
bun run dev

# Staging
NODE_ENV=staging bun run start

# Production
NODE_ENV=production bun run build:production

# Demo
DEMO_MODE=true bun run demo
```

### Environment Validation

```bash
# Validate current environment
bun run env:validate

# Check required variables
bun run env:check

# Audit security settings
bun run env:audit

# Performance check
bun run env:performance
```

---

## 🛠️ Development Tools

### Package Management

```bash
# Install workspace dependencies
bun install

# Install with frozen lockfile (CI/CD)
bun install --frozen-lockfile

# Install production only
bun install --production

# Clean install
bun run install:clean
```

### Workspace Commands

```bash
# Build all workspaces
bun run workspace:build

# Test all workspaces
bun run workspace:test

# Link workspaces
bun run workspace:link

# Version all workspaces
bun run workspace:version patch
```

### Publishing

```bash
# Dry run publishing
bun scripts/multi-registry-publisher.ts publish --dry-run

# Publish to npm
bun scripts/multi-registry-publisher.ts npm

# Publish to all registries
bun scripts/multi-registry-publisher.ts all
```

---

## 📝 Configuration Files

### bunfig.toml

```toml
[install]
registry = "https://registry.npmjs.org/"
linker = "isolated"
exact = true
dev = true

[install.scopes]
"@fire22" = "https://fire22.workers.dev/registry"
"@types" = "https://registry.npmjs.org/"

[build]
target = "bun"
format = "esm"
splitting = true
minify = false
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun-types", "@cloudflare/workers-types"]
  }
}
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Rotate secrets regularly** - Minimum every 90 days
3. **Use environment-specific secrets** - Different keys for dev/staging/prod
4. **Encrypt production secrets** - Use `.env.production.secure`
5. **Audit dependencies** - Run `bun audit` weekly
6. **Pin dependency versions** - Use exact versions in production
7. **Use trusted dependencies** - Verify with `bun pm trust`

---

## 📚 Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Environment Variables Guide](./docs/environment-variables.html)
- [Security Guidelines](./docs/security.md)
- [Deployment Guide](./docs/deployment.md)
