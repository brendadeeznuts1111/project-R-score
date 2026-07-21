# 🚀 Dev HQ - Advanced Phone Management System

Dev HQ is a cutting-edge platform for phone management and automation, powered by **Bun 1.2+ (Ultimate Edition).** It features a modular monorepo architecture, high-performance API server, and a revolutionary **Interactive PTY CLI** for real-time system management.

## ✨ Key Features (Bun 1.2+ Powered)

- **📟 Advanced PTY Terminal**: Full pseudo-terminal support in both CLI and Web Dashboard using `Bun.Terminal`. Includes **Interactive Shell Automation** (Recipe 4).
- **🛠️ Tiered Feature Bundles**: Compile-time dead-code elimination using the `feature()` macro and `--features` build flags for Free/Premium tiers.
- **📏 Perfect CLI Tables**: Layouts that align perfectly even with emojis and ANSI codes, powered by `Bun.stringWidth`.
- **📦 S3 Management**: Advanced S3 integration with focus on download behavior (`contentDisposition`), `metadata`, `encryption`, and `tags`.
- **🔐 Secure NPMRC**: CI/CD-ready token management using `${NPM_TOKEN?}` syntax.
- **🚀 High-Performance API**: Bun-powered server with zero-trust security baseline and live metrics.
- **📈 Efficient Logging**: Memory-efficient streaming of phone logs with built-in gzip compression directly to S3.

## 🏗️ Project Structure

```text
├── packages/
│   └── cli/            # Modular PTY CLI Package (@devhq/cli)
├── core/               # Core analytics, logic, and registry config
├── dashboard/          # React-based frontend dashboard
├── api/                # Bun API server and WebSocket integration
├── constants/          # Environment and feature flag definitions
├── utils/              # S3 client, Table Formatter, and PTY helpers
└── bunfig.toml         # Root registry and install configuration
```

## 🛠️ Bun 1.2+ Recipes

### Recipe 1: Interactive Shell Automation
Automate interactive `bash` sessions with real-time response capability.
```bash
bun run automation
```

### Recipe 2: Tiered Builds
Create optimized bundles for different customer tiers.
```bash
# Production Premium Build
bun run build:premium
```

### Recipe 3: Perfect CLI Layouts
Leverage `Bun.stringWidth` for layouts that never break.
```bash
# Verify string width handling
bun run scripts/verify-string-width.ts
```

### Recipe 4: Professional Package Management
Use `bun pm` utilities for advanced workflows.
```bash
# Verify untrusted dependencies
bun pm untrusted

# Pack CLI package for distribution
cd packages/cli && bun pm pack

# Quick-get package data
bun pm pkg get version
```

## 📦 Registry & Publishing

Dev HQ uses a private registry for `@devhq` scoped packages.

### Manual Publishing
```bash
# Targeted workspace publish (dry run)
bun run publish:cli

# Actual release to private registry
bun run publish:cli:live
```

## 🛠️ CLI Usage

| Command | Description |
|---------|-------------|
| `bun run terminal` | Interactive PTY session with stdin forwarding. |
| `bun run monitor` | Real-time process and log monitoring. |
| `bun run editor [file]` | Edit files directly using optimized Vim integration. |
| `bun run insights` | Color-coded codebase health and complexity analysis. |
| `bun hq i --table` | Perfect table output with emojis and ANSI support. |

---
**Dev HQ** • Built with ❤️ using the [Bun](https://bun.sh) runtime. 🚀
