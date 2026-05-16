# 🏭 FactoryWager Registry

> **Private NPM Registry** powered by Bun v1.4+, featuring bun.semver versioning, bun.secrets security, and R2-backed storage.

[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.4.0-black)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ✨ Features

- 🚀 **bun.semver** - Native version parsing and comparison
- 🔐 **bun.secrets** - OS-native encrypted credential storage
- 📊 **Visual Graphs** - ASCII, Mermaid, and JSON version graphs
- 🌐 **CDN Distribution** - Cloudflare Workers edge deployment
- 🔄 **Cross-Device Sync** - R2-backed documentation sync
- 📰 **RSS Aggregation** - Bun blog and package updates
- 🗜️ **Compression** - gzip/brotli/deflate support
- 📝 **JSON5 Config** - Comments and trailing commas

## 🚀 Quick Start

```bash
# Clone repository
git clone git@github.com:factorywager/registry.git
cd registry

# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env with your R2 credentials

# Start development server
bun run dev

# Or start production
bun run start
```

## 📦 Packages

| Package | Description | Version |
|---------|-------------|---------|
| `@factorywager/registry-core` | Core types and interfaces | 1.0.0 |
| `@factorywager/r2-storage` | R2 storage adapter | 1.0.0 |
| `@factorywager/semver` | bun.semver wrapper | 1.0.0 |
| `@factorywager/secrets` | bun.secrets manager | 1.0.0 |
| `@factorywager/bunx` | bun x integration | 1.0.0 |
| `@factorywager/version-graph` | Visual version graphs | 1.0.0 |

## 🏗️ Apps

| App | Description | Port |
|-----|-------------|------|
| `registry-server` | NPM registry server | 4873 |
| `registry-cli` | Command-line interface | - |
| `registry-worker` | Cloudflare Worker | - |

## 📚 Documentation

- [Setup Guide](./docs/SETUP.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [API Reference](./docs/API.md)
- [Deployment](./docs/DEPLOYMENT.md)

## 🛠️ Development

```bash
# Build all packages
bun run build

# Run tests
bun run test

# Type check
bun run typecheck

# Lint
bun run lint

# Format
bun run format
```

## 🌐 Deployment

### Staging
```bash
bun run deploy:staging
```

### Production
```bash
bun run deploy:production
```

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 License

MIT © FactoryWager
