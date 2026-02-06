# 🚀 FactoryWager Enterprise Platform

<div align="center">

![FactoryWager Logo](https://img.shields.io/badge/FactoryWager-Enterprise-3b82f6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)

**Enterprise-Grade Bun Native Platform for High-Performance Applications**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Bun Version](https://img.shields.io/badge/bun-1.3%2B-black.svg)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/typescript-5.0%2B-blue.svg)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/github/workflow/status/brendadeeznuts1111/project-R-score/CI/badge.svg)](https://github.com/brendadeeznuts1111/project-R-score/actions)

[📊 Metrics Dashboard](METRICS.md) • [📋 Issue Tracking](ISSUE_TRACKING_GUIDE.md) • [🔧 Documentation](docs/) • [🚀 Getting Started](#getting-started)

</div>

## 🎯 Overview

FactoryWager is a **cutting-edge enterprise platform** built with **Bun native optimizations** for maximum performance and reliability. This monorepo contains core infrastructure, security systems, performance optimizations, and enterprise-grade tools.

### ✨ Key Features

- 🔐 **Enterprise Security** - Versioned secrets, atomic operations, OWASP compliance
- ⚡ **Bun Native Performance** - Zero-copy operations, streaming I/O, optimized memory management
- 🧵 **Thread Safety** - Atomics API, SharedArrayBuffer, concurrent operations
- 📊 **Real-time Metrics** - Comprehensive monitoring and health checks
- 🏗️ **Scalable Architecture** - Microservices, event-driven, cloud-native
- 🛠️ **Developer Tools** - CLI, debugging, profiling, and automation

## Repository Structure

```text
FactoryWager/
├── lib/                       # Core library (15 subdirs)
│   ├── ab-testing/            # A/B testing with Bun.CookieMap
│   ├── core/                  # Core infra (mutex, validation, errors, bun-patterns)
│   ├── security/              # Security & authentication
│   ├── performance/           # Performance optimizations
│   ├── cli/                   # PTY terminal, TUI components
│   ├── http/                  # HTTP client, content-type handling
│   ├── r2/                    # Cloudflare R2 integration
│   ├── rss/                   # RSS feed processing
│   ├── wiki/                  # Wiki generation
│   ├── validation/            # Bun-first compliance auditing
│   ├── versioning/            # Semantic versioning tools
│   └── lib.test.ts            # Test suite (86 tests)
├── tier1380/                  # Verified Bun one-liners & native utils
├── scripts/                   # Repo hygiene, maintenance
├── utils/                     # Pipeline tools (junior-runner, batch-profiler)
├── examples/                  # Demo scripts & comparisons
├── docs/                      # Documentation
├── docs-directory/            # Docs site (React + Bun.serve)
└── projects/                  # Project templates
```

## Quick Start

```bash
# Clone and install
git clone https://github.com/brendadeeznuts1111/project-R-score.git
cd project-R-score
bun install

# Run tests (86 pass)
bun test lib/lib.test.ts

# Repo hygiene check
bun scripts/repo-hygiene.ts

# AB testing benchmark
bun lib/ab-testing/ab-testing.bench.ts

# Run all 50 verified one-liners
bun tier1380/bun-oneliners.ts

# Run development server
bun run dev
```

## Documentation Hygiene

- New docs must **not** use these markers: `summary`, `final`, `complete`, `final-complete`, `quantum`, `quantaum`, `enhance-[docname]`.
- Progress reporting belongs in `CHANGELOG.md` only (versioned entries).
- Historical reports live in `docs/archives/` and should not be extended.

## 🛠️ Available Scripts

### Development
```bash
bun run dev              # Start development server
bun run start            # Start production server
bun run test             # Run test suite
bun run build            # Build for production
```

### Quality & Hygiene
```bash
bun run hygiene          # Repo hygiene (stray files, secrets)
bun run hygiene:staged   # Pre-commit hygiene (staged files only)
bun run lint             # ESLint with auto-fix
bun run format           # Prettier formatting
bun run type-check       # TypeScript type checking
bun run security:audit   # Security audit
```

### Tools & Utilities
```bash
bun run dashboard:ansi   # ANSI dashboard
bun run url:validate     # Validate URLs
bun run benchmark        # Performance benchmark
```

### MCP Servers
```bash
bun run mcp:bun          # Bun MCP server
bun run mcp:security     # Security MCP server
```

## 🏗️ Architecture

Built with modern technologies centered around **Bun** - the fast, incrementally adoptable all-in-one JavaScript, TypeScript & JSX toolkit:

### Why Bun?
- **⚡ Performance** - Extends JavaScriptCore for maximum speed
- **🔧 All-in-One Toolkit** - Runtime, bundler, test runner, and package manager
- **🎯 Node.js Compatible** - Drop-in replacement with 100% compatibility goal
- **🚀 Zero Configuration** - TypeScript, JSX, React, and CSS imports work out of the box

### Technology Stack
- **Runtime**: Bun for optimal performance and built-in APIs
- **Language**: TypeScript for type safety
- **Architecture**: Monorepo with shared libraries
- **Testing**: Built-in Bun test runner (10-30x faster than Jest)
- **Package Management**: Bun install (30x faster than npm/yarn)
- **Code Quality**: ESLint + Prettier
- **Bundling**: Bun's built-in production bundler with tree-shaking

## Tier1380 One-Liners

50 verified `bun -e` one-liners covering the full Bun API surface:

```bash
# Run all 50
bun tier1380/bun-oneliners.ts

# Tier 1 (#1-20): Color, TOML, Hash, Zstd, Glob, DNS, Shell, GC,
#   EscapeHTML, Nanoseconds, StringWidth, Table, Password, DeepMatch,
#   Markdown, CryptoHasher, Inspect
#
# Tier 2 (#21-50): Streaming, Hex Dump, Base64, Binary Read, HTTP Probe,
#   HMAC, PBKDF2, JWT Decode, Timing-Safe Compare, CSV/JSON Transforms,
#   NDJSON Parse, Env Audit, Sparklines, Progress Bar, Rainbow Text,
#   Tree View, Process List, Stack Beautifier, Leak Detector,
#   Nano-Profiler, Zstd Round-Trip, Self-Compile to Standalone Binary
```

## 🚀 Bun-Powered Capabilities

This project leverages Bun's extensive built-in APIs and tooling:

### Built-in Bun APIs Used
- **Bun.serve()** - HTTP/WebSocket servers with routes
- **Bun.file() / Bun.write()** - Fast async file I/O
- **Bun.CookieMap** - Type-safe cookie handling (AB testing)
- **Bun.CryptoHasher** - SHA-256, HMAC, content hashing
- **Bun.markdown.html()** - Zig-powered CommonMark + GFM parser
- **Bun.color()** - CSS color conversion (hex, rgb, ansi-16m)
- **Bun.zstdCompressSync()** - Native zstd compression
- **Bun.dns.lookup()** - Async DNS resolution
- **Bun.nanoseconds()** - Monotonic nanosecond timing
- **Bun.inspect.table()** - ASCII table rendering
- **Bun.TOML.parse()** - Native TOML parser
- **Bun.password.hash()** - bcrypt/argon2 password hashing
- **Bun.Glob** - Fast file pattern matching
- **Bun.$\`cmd\`** - Shell template literals
- **Bun.sql / Bun.redis** - PostgreSQL and Redis clients

### Performance
- **Hot Module Replacement** - `bun --hot` for instant dev updates
- **Production Bundling** - Tree-shaking and minification via `bun build`
- **Fast Installs** - 30x faster dependency management
- **Fast Tests** - 86 tests in ~160ms via built-in test runner
- **bun build --compile** - Standalone binaries, no runtime needed

## Testing

```
86 tests, 184 expect() calls, 0 failures (~160ms)
```

Test coverage includes:
- **AB Testing** (28 tests) - ABTestManager + legacy wrapper, cookie persistence, weighted distribution, forceAssign, Set-Cookie headers
- **PTY Terminal** - Platform detection, terminal creation, config defaults
- **Terminal TUI** - Spinners, progress bars, tables, deployment UI
- **R2 Signed URLs** - URL generation, expiry, content types
- **S3 Content Encoding** - Compression, upload, tier1380 integration
- **Core Validation** - String/number validators, type guards, error codes
- **FFI Environment** - Environment verification, example validation
- **Repo Hygiene** - Stray file detection, secrets, pattern matching

## AB Testing Module

Cookie-based A/B testing with `Bun.CookieMap`:

```typescript
import { ABTestManager } from "./lib/ab-testing/manager";

const manager = new ABTestManager(request.headers.get("cookie"));
manager.registerTest({ id: "checkout-flow", variants: ["control", "new-ui"], weights: [50, 50] });

const variant = manager.getVariant("checkout-flow");
// Returns "control" or "new-ui", persisted via cookie

const headers = manager.getSetCookieHeaders();
// ["ab_checkout_flow=control; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax"]
```

Benchmark (Bun 1.3.8, Apple Silicon):
| Operation | Ops/s | Latency |
|---|---|---|
| Cached variant read | 14.8M | 68ns |
| Full request cycle | 894K | 1.1us |
| Cookie serialization | 1.5M | 688ns |

## Version History

- `v5.1.0` - AB testing, tier1380 one-liners, repo hygiene, lib/ reorg
- `v4.4.2-http2-preview` - HTTP/2 preview features
- `v4.4.1` - Stable release
- `v4.4-rscore-optimized` - R-Score optimization release

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `bun run test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
