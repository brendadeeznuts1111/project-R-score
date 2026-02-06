# Complete Bun Documentation System

## Overview

This integrated system provides comprehensive documentation management with:
- **Package Management**: Auto-discovery of Bun APIs in your project
- **R2 Storage**: Cloud storage for documentation, cache, and feeds
- **RSS Feed Management**: Subscribe to and generate RSS feeds
- **Interactive Documentation Server**: Real-time docs with automatic updates
- **Dependency Analysis**: Understand your project's Bun compatibility

## Quick Start

### 1. Initialize a Project

```bash
cd my-project
bun run cli/integrated-cli.ts init
```

This will:
- Create `package.json` if it doesn't exist
- Set up R2 bucket (if credentials configured)
- Subscribe to Bun RSS feed
- Install documentation dependencies

### 2. Analyze Your Package

```bash
bun run cli/integrated-cli.ts analyze
bun run cli/integrated-cli.ts analyze --graph  # With dependency graph
```

### 3. Start Documentation Server

```bash
bun run cli/integrated-cli.ts serve --port=8080
```

Visit `http://localhost:8080` to see your package documentation.

### 4. Sync to R2

```bash
bun run cli/integrated-cli.ts sync
```

### 5. Publish Documentation

```bash
bun run cli/integrated-cli.ts publish
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# R2 Configuration
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET=bun-docs-prod
```

## Available Commands

- `init [name]` - Initialize project with documentation
- `analyze [--graph]` - Analyze package for Bun APIs
- `deps` - Analyze dependencies
- `r2 <op>` - R2 operations (list, upload, sync)
- `rss <op>` - RSS operations (subscribe, fetch, package, generate)
- `sync` - Sync everything to R2
- `serve [--port=3000]` - Start documentation server
- `publish` - Publish documentation to R2

## Docker Deployment

```bash
# Build
docker build -t bun-docs .

# Run
docker run -p 3000:3000 \
  -e R2_ACCOUNT_ID=your_id \
  -e R2_ACCESS_KEY_ID=your_key \
  -e R2_SECRET_ACCESS_KEY=your_secret \
  bun-docs serve
```

## Package.json Scripts

The system adds these scripts to your `package.json`:

```json
{
  "scripts": {
    "docs:dev": "bun-docs serve",
    "docs:build": "bun-docs publish",
    "docs:sync": "bun-docs sync"
  }
}
```

## Architecture

```text
lib/
├── package/
│   └── package-manager.ts      # Package analysis & Bun API discovery
├── r2/
│   └── r2-storage-enhanced.ts  # R2 storage with package integration
└── rss/
    └── rss-manager.ts          # RSS feed management & caching

cli/
└── integrated-cli.ts           # Main CLI with all features
```

## Features

### Package Management
- Scans project files for Bun API usage
- Generates dependency graphs
- Identifies Bun-compatible packages
- Auto-installs documentation dependencies

### R2 Storage
- Package-specific bucket creation
- Compressed storage with zstd
- HTML documentation generation
- Cache synchronization

### RSS Feeds
- Feed subscription management
- Package-specific feed generation
- R2-backed caching
- Automatic updates

### Documentation Server
- Interactive HTML documentation
- RSS feed integration
- API endpoints for programmatic access
- Real-time updates

## Examples

See `examples/comprehensive-usage.ts` for detailed examples of all features.
