# 🚀 FactoryWager Enterprise Platform

<div align="center">

![FactoryWager Logo](https://img.shields.io/badge/FactoryWager-Enterprise-3b82f6?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K)

**Enterprise-Grade Bun Native Platform for High-Performance Applications**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Bun Version](https://img.shields.io/badge/bun-1.0%2B-black.svg)](https://bun.sh)
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

## � Repository Structure

```text
FactoryWager/
├── 📁 lib/                    # Core library components
│   ├── 🔐 security/           # Security & authentication
│   ├── ⚡ core/               # Core infrastructure
│   ├── 🧠 memory-pool.ts      # Shared memory management
│   ├── 🦊 bun-*.ts           # Bun native implementations
│   └── 📊 performance/       # Performance optimizations
├── 📁 server/                # Server implementations
├── 📁 services/              # Microservices
├── 📁 tools/                 # Developer tools
├── 📁 tests/                 # Test suites
├── 📁 docs/                  # Documentation
├── 📁 projects/              # Project templates
├── 📁 .github/               # GitHub workflows & templates
└── 📁 scripts/               # Build & deployment scripts
```

## �🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/brendadeeznuts1111/project-R-score.git
cd project-R-score
bun install

# Run development server
bun run dev

# Run tests
bun test

# Build for production
bun run build
```

## 📁 Project Structure

This monorepo is organized into specialized directories:

### Core Directories
- **`projects/`** - All project implementations organized by category
- **`lib/`** - Shared libraries and utilities
- **`bun-markdown-constants/`** - Enterprise markdown constants package with bun link demo
- **`tools/`** - Standalone development tools
- **`utils/`** - Utility scripts and helpers
- **`deployment/`** - Deployment configurations
- **`docs/`** - Comprehensive documentation
- **`docs/archives/`** - Historical reports (read-only)
- **`docs/data/`** - Diagnostic data and reports
- **`tools/`** - Root tooling CLIs (all root-level utilities live here)
- **`scripts/`** - Shell scripts and maintenance tasks

### Project Categories
- **`automation/`** - Automation frameworks and scripts
- **`dashboards/`** - Enterprise dashboard interfaces
- **`analysis/`** - Security and performance analysis tools
- **`apps/`** - Application projects
- **`enterprise/`** - Enterprise-grade solutions
- **`development/`** - Development tools and utilities

### 📦 Featured Package: `@bun-tools/markdown-constants`

Located in `bun-markdown-constants/`, this package demonstrates:

- **Enterprise-grade markdown constants** for Bun's built-in parser
- **Complete bun link workflow** demonstration
- **Optional React support** with graceful fallback
- **Comprehensive documentation** and usage examples

#### Quick Start with bun link:
```bash
# Link the package locally
cd bun-markdown-constants
bun link

# Use in your project
cd your-project
bun link @bun-tools/markdown-constants

# Test functionality
bun run test-linked-package.ts

# Unlink when done
cd bun-markdown-constants
bun unlink
```

## 📌 Documentation Hygiene

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

### Tools & Utilities
```bash
bun run dashboard:ansi   # ANSI dashboard
bun run url:validate     # Validate URLs
bun run lint             # ESLint with auto-fix
bun run format           # Prettier formatting
bun run type-check       # TypeScript type checking
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

## � bun link - Local Package Development

This project includes a complete demonstration of Bun's `bun link` functionality for local package development.

### 📦 Featured Package: `@bun-tools/markdown-constants`

A production-ready package showcasing:
- Enterprise-grade markdown constants for Bun's built-in parser
- Optional React support with graceful fallback
- Comprehensive error handling and validation
- Complete documentation and examples

### 🚀 Quick Start

```bash
# 1. Link the package locally
cd bun-markdown-constants
bun link

# 2. Use in your project
cd your-project
bun link @bun-tools/markdown-constants

# 3. Test the functionality
import { MarkdownPresets, MARKDOWN_SECURITY } from '@bun-tools/markdown-constants';

const html = MarkdownPresets.html('GFM', 'MODERATE')('# Hello **World**');
console.log(html); // <h1>Hello <strong>World</strong></h1>

# 4. Unlink when done
cd bun-markdown-constants
bun unlink
```

### ⚙️ Advanced bun link Features

#### Installation Control
```bash
# Force fresh installation
bun link --force

# Use specific backend
bun link --backend symlink    # clonefile|hardlink|symlink|copyfile

# Linker strategy
bun link --linker isolated    # isolated|hoisted
```

#### Global Configuration
```bash
# Use custom config
bun link --config ./bunfig.toml

# Set working directory
bun link --cwd ./packages/shared
```

#### Installation Scope
```bash
# Local linking (default)
bun link

# Global linking for CLI tools
bun link -g
```

### 📚 Configuration Example

Create `bunfig.toml` for team consistency:

```toml
[install]
cache = "./.bun-cache"
backend = "symlink"

[link]
linker = "isolated"
trustedDependencies = ["react", "typescript"]
```

### 🎯 Use Cases

| Scenario | Command | Description |
|----------|---------|-------------|
| **Package Development** | `bun link` | Link libraries to projects |
| **CLI Tools** | `bun link -g` | System-wide tool availability |
| **Monorepos** | `bun link --linker isolated` | Dependency isolation |
| **Team Work** | `bun link --config ./team-config/bunfig.toml` | Consistent environments |

## �📊 Features

- **Enterprise Dashboards** - Real-time monitoring and analytics
- **Automation Frameworks** - Streamlined workflow automation
- **Security Tools** - Comprehensive security validation
- **Performance Optimization** - Advanced optimization utilities
- **MCP Integration** - Model Context Protocol servers
- **Documentation System** - Auto-generated documentation

## 🚀 Bun-Powered Capabilities

This project leverages Bun's extensive built-in APIs and tooling:

### Built-in APIs Used
- **HTTP/WebSocket Servers** - High-performance server implementations
- **File System Operations** - Fast async file operations with `Bun.file()`
- **Database Integration** - Direct PostgreSQL and Redis connectivity
- **Shell Commands** - Execute shell scripts with `Bun.$` 
- **Password Hashing** - Built-in security utilities
- **YAML/JSON Processing** - Native configuration file handling
- **Markdown Parser** - World's fastest CommonMark + GFM parser (v1.3.8)

### Package Management Features
- **bun link** - Local package development with symlinks
- **Installation Control** - Multiple backends (clonefile, hardlink, symlink, copyfile)
- **Global Configuration** - bunfig.toml support for team consistency
- **Dependency Management** - Fast installs with trusted dependencies

### Performance Benefits
- **Hot Module Replacement** - Instant development updates without refresh
- **Production Bundling** - Optimized builds with tree-shaking and minification
- **Fast Package Installs** - 30x faster dependency management
- **Speedy Test Execution** - Run tests 10-30x faster than traditional runners
- **Local Development** - bun link provides instant package updates

### Developer Experience
- **Zero Configuration** - TypeScript, JSX, and imports work immediately
- **Built-in Tooling** - Everything needed without additional setup
- **Incremental Adoption** - Use individual tools or the complete stack
- **Local Package Development** - Seamless bun link workflow for package authors

## 🏷️ Version History

- `v4.4.2-http2-preview` - HTTP/2 preview features
- `v4.4.1` - Latest stable release
- `v4.4-rscore-optimized` - R-Score optimization release

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `bun run test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
