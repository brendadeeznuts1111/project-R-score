# Getting Started

Get up and running with Fire22 Dashboard in minutes using Bun's lightning-fast
development experience.

## Prerequisites

<div className="bun-highlight">
<strong>Required:</strong> Bun >= 1.2.20 for latest features including native DNS caching and security scanning.
</div>

- **Bun** >= 1.2.20 (recommended: latest version)
- **Node.js** >= 18.0.0 (for compatibility)
- **PostgreSQL** >= 13 (for development database)
- **Git** for version control

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/brendadeeznuts1111/fire22-dashboard-worker
cd dashboard-worker
```

### 2. Install Dependencies

```bash
# Install with security scanning
bun install --frozen-lockfile

# Alternative: Skip security scanning for faster install
bun install --no-audit
```

<div className="performance-metric">
⚡ <strong>Install Performance:</strong> Bun installs dependencies ~10x faster than npm with built-in security scanning.
</div>

### 3. Environment Setup

```bash
# Copy example environment files
cp .env.example .env
cp .env.test.example .env.test

# Run the interactive environment wizard
bun run env:setup-wizard
```

### 4. Database Setup

```bash
# Start PostgreSQL (if using Docker)
docker run -d --name fire22-postgres \
  -e POSTGRES_DB=fire22 \
  -e POSTGRES_USER=fire22 \
  -e POSTGRES_PASSWORD=development \
  -p 5432:5432 postgres:15

# Run database migrations
bun run setup-db
```

## Development Server

### Start the Dashboard

```bash
# Cloudflare Workers development mode
bun run dev

# Or Express.js with PostgreSQL
bun run dev-server

# Or both (recommended for full feature testing)
bun run dev:full
```

<div className="api-endpoint">
<strong>🌐 Local URLs:</strong><br/>
• Dashboard: <code>http://localhost:3001</code><br/>
• API Health: <code>http://localhost:3001/health</code><br/>
• Live Events: <code>http://localhost:3001/api/live</code> (SSE)<br/>
• Fire22 Status: <code>http://localhost:3001/dashboard</code> (Fire22 tab)
</div>

## Verify Installation

### 1. Health Check

```bash
# Quick system health validation
curl http://localhost:3001/health

# Expected response: {"status": "ok", "timestamp": "..."}
```

### 2. Run Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Watch mode for development
bun test --watch
```

### 3. Test Fire22 Integration

```bash
# Test Fire22 connectivity (requires API credentials)
curl http://localhost:3001/api/test/fire22

# Check DNS performance
bun test scripts/dns-performance.test.ts
```

<div className="performance-metric">
🎯 <strong>DNS Performance Results:</strong><br/>
• Average Response Time: 1-2ms<br/>
• Cache Hit Rate: 95%+<br/>
• Domains Cached: 6 (Fire22 + Database infrastructure)
</div>

## Development Workflow

### Essential Commands

```bash
# Development
bun run dev                    # Cloudflare Workers dev mode
bun run dev-server            # Express.js with PostgreSQL

# Testing
bun test                      # Run all tests
bun test --watch             # Watch mode
bun run test:quick           # Critical endpoint validation

# Building
bun run build                # Multi-profile build
bun run build:production     # Optimized production build

# Health & Monitoring
bun run health:comprehensive # Matrix health system
bun run monitor             # Real-time monitoring
```

### Workspace Commands

```bash
# Find code patterns
bun run dev-flow find "pattern"    # Search with native regex
bun run flow api                   # Find API endpoints
bun run search tags todo           # Search tagged code

# Workspace operations
fire22-workspace status            # Multi-domain status
fire22-workspace benchmark         # Performance benchmarks
```

## Project Structure

```text
dashboard-worker/
├── src/                    # Source code
│   ├── api/               # API controllers & middleware
│   ├── dashboard.html     # Main dashboard interface
│   ├── index.ts          # Cloudflare Workers entry
│   └── patterns/         # Pattern Weaver system
├── scripts/               # Automation & utilities
│   ├── dns-performance.test.ts  # DNS validation
│   ├── matrix-health.ts         # Health monitoring
│   └── workspace-orchestrator.ts
├── packages/              # Workspace packages
│   ├── security-scanner/  # Bun security scanner
│   ├── wager-system/     # Fire22 wager processing
│   └── load-testing/     # Performance testing
├── docs/                 # Documentation (this site!)
└── workspaces/          # Fire22 API integrations
```

## Next Steps

1. **🏗️ [Architecture Overview](/architecture/overview)** - Understand the
   system design
2. **🔌 [API Integration](/api/fire22/authentication)** - Connect to Fire22 APIs
3. **⚡ [Performance Optimization](/architecture/performance/optimization)** -
   Advanced tuning
4. **🧪 [Testing Guide](./development/testing)** - Writing and running tests
5. **🚀 [Deployment](./development/deployment)** - Production deployment

## Troubleshooting

### Common Issues

**Bun version conflicts:**

```bash
bun --version  # Ensure >= 1.2.20
bun upgrade    # Update to latest
```

**DNS performance issues:**

```bash
# Test DNS configuration
bun test scripts/dns-performance.test.ts

# Check cache statistics
curl http://localhost:3001/api/fire22/dns-stats
```

**Database connection issues:**

```bash
# Verify PostgreSQL is running
pg_isready -h localhost -p 5432

# Test database connection
bun run scripts/test-integration.ts
```

For more troubleshooting help, see our
[Troubleshooting Guide](./troubleshooting/common-issues).

---

`&lt;div className="fire22-badge"&gt;`Quick Setup</div>
`&lt;div className="fire22-badge"&gt;`Bun Native</div>
`&lt;div className="fire22-badge"&gt;`Production Ready</div>
