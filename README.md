# Project R-Score Monorepo

A comprehensive development ecosystem featuring enterprise-grade tools, automation frameworks, and performance optimization utilities built with Bun and TypeScript.

## 🚀 Quick Start

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
- **`tools/`** - Standalone development tools
- **`utils/`** - Utility scripts and helpers
- **`deployment/`** - Deployment configurations
- **`docs/`** - Comprehensive documentation

### Project Categories
- **`automation/`** - Automation frameworks and scripts
- **`dashboards/`** - Enterprise dashboard interfaces
- **`analysis/`** - Security and performance analysis tools
- **`apps/`** - Application projects
- **`enterprise/`** - Enterprise-grade solutions
- **`development/`** - Development tools and utilities

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

## 📊 Features

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

### Performance Benefits
- **Hot Module Replacement** - Instant development updates without refresh
- **Production Bundling** - Optimized builds with tree-shaking and minification
- **Fast Package Installs** - 30x faster dependency management
- **Speedy Test Execution** - Run tests 10-30x faster than traditional runners

### Developer Experience
- **Zero Configuration** - TypeScript, JSX, and imports work immediately
- **Built-in Tooling** - Everything needed without additional setup
- **Incremental Adoption** - Use individual tools or the complete stack

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
