# Examples Directory

This directory contains comprehensive examples demonstrating Bun's native APIs, patterns, and integrations for the NEXUS Trading Intelligence Platform.

## 📁 Directory Structure

```
examples/
├── README.md                    # This file - main examples index
├── telegram-golden-setup.ts    # Telegram supergroup setup example
├── telegram-golden-setup.md    # Documentation for Telegram setup
├── audit-websocket-client.ts   # WebSocket audit client example
├── bun-shell-example.sh        # Basic shell scripting example
└── demos/                      # Comprehensive API demonstrations
    ├── README.md              # Demos index
    ├── demo-bun-utils.ts      # Bun native utilities (file, crypto, timing)
    ├── demo-html-rewriter.ts  # HTML transformation API
    ├── demo-bun-spawn-complete.ts  # Process execution API
    ├── demo-bun-shell-env-redirect-pipe.ts  # Shell operations
    └── ... (additional demos)
```

## 🚀 Quick Start

Run any example with Bun:

```bash
# Telegram setup example
bun run examples/telegram-golden-setup.ts setup

# WebSocket audit client
bun run examples/audit-websocket-client.ts

# Bun utilities demo
bun run examples/demos/demo-bun-utils.ts

# HTML rewriter demo
bun run examples/demos/demo-html-rewriter.ts
```

## 📚 Example Categories

### 🔧 Core Bun APIs

| Example | Description | Key Features |
|---------|-------------|--------------|
| `demo-bun-utils.ts` | Comprehensive Bun utilities | `Bun.file()`, `Bun.CryptoHasher`, `Bun.nanoseconds()`, `Bun.inspect()`, `Bun.Glob()` |
| `demo-bun-spawn-complete.ts` | Process execution | `Bun.spawn()`, stdin/stdout handling, process management |
| `demo-html-rewriter.ts` | HTML transformation | Element manipulation, CSS selectors, async transforms |

### 🌐 Networking & Servers

| Example | Description | Key Features |
|---------|-------------|--------------|
| `demo-html-rewriter-server.ts` | HTTP server with HTML rewriting | `Bun.serve()`, live HTML transformation |
| `demo-html-rewriter-live-editor.ts` | Interactive HTML editor | Real-time editing, WebSocket updates |
| `audit-websocket-client.ts` | WebSocket client | Real-time audit data streaming |
| `urlpattern-router-demo.ts` | URLPattern router examples | Route registration, middleware, parameters, metrics |
| `urlpattern-router-integration.ts` | Router integration example | Parallel routers, gradual migration, Bun.serve integration |

### 🔒 Security & Authentication

| Example | Description | Key Features |
|---------|-------------|--------------|
| `telegram-golden-setup.ts` | Telegram bot setup | `Bun.secrets`, secure credential storage |

### 📊 Data Processing

| Example | Description | Key Features |
|---------|-------------|--------------|
| `demo-circular-buffer.ts` | Circular buffer implementation | Memory-efficient data structures |
| `demo-advanced-circular-buffer.ts` | Advanced circular buffer | Performance optimizations |

### 🛠️ Development Tools

| Example | Description | Key Features |
|---------|-------------|--------------|
| `demo-console-features.ts` | Enhanced console output | Colors, formatting, debugging |
| `demo-fetch-debug.ts` | HTTP request debugging | Request/response inspection |
| `fix-type-errors.ts` | TypeScript error fixing | Automated error resolution |

### 🏗️ Specialized Features

| Example | Description | Key Features |
|---------|-------------|--------------|
| `demo-tag-manager-pro.ts` | Advanced tag management | DOM manipulation, CSS injection |
| `demo-worker-threads.ts` | Worker thread examples | Parallel processing |
| `bun-shell-example.sh` | Shell scripting | Environment variables, command execution |

## 🎯 Featured Examples

### Telegram Golden Supergroup Setup
Complete example for setting up a Telegram supergroup with automated topic creation, bot permissions verification, and deep-link integration.

```bash
bun run examples/telegram-golden-setup.ts setup
bun run examples/telegram-golden-setup.ts verify
bun run examples/telegram-golden-setup.ts example-message
```

### Bun Utils Comprehensive Demo
Showcases all major Bun native APIs with performance comparisons and practical usage patterns.

```bash
bun run examples/demos/demo-bun-utils.ts
```

### HTML Rewriter Live Editor
Interactive HTML editor demonstrating real-time transformation capabilities.

```bash
bun run examples/demos/demo-html-rewriter-live-editor.ts
```

## 🔍 Finding Examples

### By API
- **File I/O**: `demo-bun-utils.ts`
- **HTTP/WebSocket**: `demo-html-rewriter-server.ts`, `audit-websocket-client.ts`
- **Routing**: `urlpattern-router-demo.ts`, `urlpattern-router-integration.ts`
- **Process Execution**: `demo-bun-spawn-complete.ts`
- **Cryptography**: `demo-bun-utils.ts`
- **HTML Processing**: `demo-html-rewriter*.ts`
- **Shell Scripting**: `bun-shell-example.sh`, `demo-bun-shell-env-redirect-pipe.ts`

### By Use Case
- **Web Development**: HTML rewriter demos, server examples, router examples
- **API Routing**: URLPattern router demos, integration examples
- **CLI Tools**: Spawn demos, shell examples
- **Data Processing**: Circular buffer demos
- **Security**: Telegram setup, secrets usage
- **Debugging**: Console features, fetch debug

## 📖 Documentation

Each example includes:
- **Comprehensive JSDoc** with usage examples
- **Version tracking** with ripgrep patterns
- **Test formulas** for validation
- **Cross-references** to related documentation

## 🏃 Running Examples

### Prerequisites
- Bun 1.3.3+ (some features require 1.4+)
- For Telegram examples: Bot token and chat ID
- For network examples: Internet connection

### Common Commands
```bash
# Run directly
bun run examples/example-name.ts

# Run with arguments
bun run examples/telegram-golden-setup.ts setup

# Run shell examples
bun examples/bun-shell-example.sh
```

## 🤝 Contributing

Examples follow these conventions:
- **Comprehensive documentation** with JSDoc
- **Error handling** for edge cases
- **Performance considerations** where relevant
- **Cross-platform compatibility**
- **TypeScript throughout**

## 📋 Coverage Status

### ✅ Well Covered
- Bun native utilities (file, crypto, timing, inspection, glob)
- HTML rewriting and transformation
- Process execution and shell operations
- WebSocket clients and servers
- HTTP servers and APIs (Bun.serve() comprehensive examples)
- **URLPattern routing** (router demos, integration examples, middleware patterns)
- Telegram bot integration
- Security APIs (Bun.CSRF, Bun.secrets comprehensive examples)
- Database operations (SQLite, PostgreSQL, MySQL)
- Testing frameworks and patterns
- Build and deployment workflows
- Performance benchmarking and comparisons
- Real-world application patterns

### 🚧 Needs Enhancement
- Advanced enterprise patterns
- Cloud deployment examples
- Microservices architectures

### 📝 Planned Additions
- Enterprise security hardening examples
- Advanced microservices patterns
- Cloud-native deployment examples

## 🔗 Related Documentation

- [Bun Documentation](https://bun.com/docs)
- [NEXUS Platform Architecture](../docs/)
- [CLI Commands](../commands/)
- [API Reference](../src/api/)

---

*Last updated: December 2025*</content>
<parameter name="filePath">examples/README.md