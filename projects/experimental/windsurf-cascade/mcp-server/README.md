# MCP Server for Odds Protocol

## Overview

This Model Context Protocol (MCP) server provides comprehensive automation and management tools for the Odds Protocol monorepo. It enables AI assistants to execute, optimize, and manage JavaScript/TypeScript projects using Bun's high-performance runtime.

## Features

### 🛠️ Project Management
- **Automated Setup**: Create new Odds Protocol projects with optimal configuration
- **Template Selection**: Choose from minimal, full, WebSocket, or ML templates
- **CI/CD Integration**: Automatic GitHub Actions setup
- **Dependency Management**: Intelligent catalog-based dependency resolution

### 🧪 Testing Automation
- **Comprehensive Test Suite**: Unit, integration, and performance tests

### 📊 **Resources & Prompts**
- **bun-features**: Complete Bun runtime feature overview
- **bun-performance-tips**: Optimization techniques and benchmarks
- **Migration guides**: Node.js to Bun migration strategies
- **Testing strategies**: Comprehensive testing with Bun test runner

## 🛠️ Available Tools

### Bun Documentation & Runtime

#### `search-bun-docs`
Search the Bun documentation for specific information, API references, and examples.

**Parameters:**
- `query` (string): Search query for Bun documentation

**Example:**
```json
{
  "query": "how to use bun test with typescript"
}
```

#### `run-bun-script`
Execute JavaScript/TypeScript files with Bun runtime optimizations.

**Parameters:**
- `scriptPath` (string): Path to the script file
- `bunArgs` (array): Optional Bun flags (e.g., `["--smol", "--hot"]`)
- `args` (array): Arguments to pass to the script
- `cwd` (string): Working directory
- `timeout` (number): Execution timeout in milliseconds

#### `bun-package-manager`
Manage dependencies with Bun's ultra-fast package manager.

**Parameters:**
- `action` (enum): `"install" | "add" | "remove" | "update"`
- `packageDir` (string): Directory containing package.json
- `packages` (array): Package names for add/remove actions
- `dev` (boolean): Install as development dependencies

#### `bun-build-optimize`
Build and optimize projects with Bun's advanced bundler.

**Parameters:**
- `entryPoint` (string): Entry file to build
- `outDir` (string): Output directory (default: `"./dist"`)
- `target` (enum): `"browser" | "bun" | "node"` (default: `"browser"`)
- `minify` (boolean): Enable minification (default: `true`)
- `sourcemap` (boolean): Generate source maps (default: `false`)
- `splitting` (boolean): Enable code splitting (default: `true`)

### Project Automation

#### `setup-project`
Automatically set up new Odds Protocol projects with optimal configuration.

**Parameters:**
- `projectName` (string): Name of the project
- `template` (enum): `"minimal" | "full" | "websocket" | "ml"`
- `includeTests` (boolean): Include test setup (default: `true`)
- `includeCI` (boolean): Include CI/CD setup (default: `true`)

#### `run-comprehensive-tests`
Execute complete test suite with coverage, performance, and integration tests.

**Parameters:**
- `coverage` (boolean): Enable coverage reporting (default: `true`)
- `concurrent` (boolean): Enable concurrent test execution (default: `true`)
- `performance` (boolean): Include performance tests (default: `false`)
- `integration` (boolean): Include integration tests (default: `true`)

#### `verify-project-health`
Perform incremental verification of project health and dependencies.

**Parameters:**
- `deepScan` (boolean): Enable deep scanning (default: `false`)
- `security` (boolean): Include security audit (default: `true`)
- `performance` (boolean): Include performance analysis (default: `true`)

#### `automated-deployment`
Execute automated deployment with validation and rollback capabilities.

**Parameters:**
- `environment` (enum): `"development" | "staging" | "production"`
- `region` (string): Deployment region (default: `"us-east-1"`)
- `force` (boolean): Force deployment (default: `false`)

## 📋 Available Resources

### `bun-features`
Complete overview of Bun runtime features, advantages, and use cases.

### `bun-performance-tips`
Comprehensive optimization techniques, benchmarks, and memory management tips.

### `project-structure`
Detailed information about the Odds Protocol monorepo structure and packages.

### `test-configuration`
Current testing framework configuration and best practices.

## 💬 Available Prompts

### `optimize-performance`
Generate performance optimization recommendations using Bun-specific features.

**Parameters:**
- `component` (string, optional): Specific component to optimize
- `metrics` (boolean): Include performance metrics (default: `true`)

### `setup-development-environment`
Comprehensive development environment setup with Bun runtime.

**Parameters:**
- `platform` (enum): `"macos" | "linux" | "windows"` (default: `"macos"`)
- `features` (array): Features to include (default: `["all"]`)

### `bun-migration-guide`
Guide for migrating existing Node.js projects to Bun runtime.

**Parameters:**
- `projectType` (enum, optional): `"express" | "react" | "vue" | "cli" | "library"`
- `compatibility` (boolean): Include compatibility checks (default: `true`)

### `bun-testing-strategy`
Comprehensive testing strategy using Bun's built-in test runner.

**Parameters:**
- `framework` (enum): `"vitest" | "bun-test" | "jest"` (default: `"bun-test"`)
- `coverage` (boolean): Include coverage reporting (default: `true`)
- `e2e` (boolean): Include end-to-end testing (default: `false`)

### `bun-deployment-optimization`
Optimize deployment pipeline using Bun's build and runtime features.

**Parameters:**
- `target` (enum): `"docker" | "vercel" | "railway" | "aws"` (default: `"docker"`)
- `minification` (boolean): Enable minification (default: `true`)
- `splitting` (boolean): Enable code splitting (default: `true`)

## 🚦 Getting Started

### Prerequisites

- **Bun** runtime installed (v1.3.0+ recommended)
- **Node.js** and **npm** for MCP SDK compatibility
- **Git** for version control operations

### Installation

1. **Clone the repository:**
   ```bash
   git clone git@github.com:brendadeeznuts1111/windsurf-project.git
   cd windsurf-project/mcp-server
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Build the server:**
   ```bash
   bun run build
   ```

### Configuration

Add the MCP server to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "bun-search": {
      "command": "bun",
      "args": ["run", "/Users/nolarose/CascadeProjects/windsurf-project/mcp-server/working-server.ts"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Alternative: Use the original comprehensive server:**
```json
{
  "mcpServers": {
    "odds-protocol": {
      "command": "bun", 
      "args": ["run", "/Users/nolarose/CascadeProjects/windsurf-project/mcp-server/index.ts"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Usage Examples

#### Searching Bun Documentation
```
Search for "how to use bun test with typescript coverage"
```

#### Setting Up a New Project
```
Set up a new WebSocket project called "realtime-server" with tests and CI
```

#### Running Performance Tests
```
Run comprehensive tests with coverage and performance analysis
```

#### Optimizing Build Process
```
Build my TypeScript project with minification and source maps for browser target
```

## 🎯 Performance Optimizations

### Bun-Specific Features

- **⚡ Fast Package Manager**: 10x faster than `npm install`
- **🔥 Hot Reload**: Automatic file watching with `--hot` flag
- **💾 Memory Optimization**: Reduced footprint with `--smol` flag
- **📦 Built-in TypeScript**: No compilation step required
- **🏗️ Advanced Bundler**: Fast builds with code splitting

### Integration Benefits

- **Seamless Migration**: Node.js API compatibility
- **Unified Toolchain**: Single tool for all development needs
- **Performance Monitoring**: Built-in profiling and metrics
- **Security**: Integrated vulnerability scanning

## 🔧 Development

### Running in Development Mode

```bash
bun run dev
```

### Building for Production

```bash
bun run build
```

### Running Tests

```bash
bun run test
```

### Linting

```bash
bun run lint
```

### Type Checking

```bash
bun run typecheck
```

## 📊 Architecture

```
mcp-server/
├── index.ts              # Main MCP server implementation
├── package.json          # Dependencies and scripts
├── bun.lock              # Bun lockfile
├── README.md             # This documentation
└── src/                  # Source code (if expanded)
    ├── tools/            # MCP tool implementations
    ├── resources/        # Resource providers
    └── prompts/          # Prompt templates
```

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Server Won't Start
```bash
# Check dependencies
bun install

# Test basic functionality
bun run start

# Check for syntax errors
bun --check working-server.ts
```

#### 2. MCP Client Connection Issues
- **Verify path**: Ensure the absolute path is correct in Claude config
- **Check permissions**: Make sure the file is executable
- **Test manually**: Run `bun run working-server.ts` to verify it starts

#### 3. Search API Issues
- The server includes fallback responses when external APIs are unavailable
- Local documentation is always accessible even without internet

#### 4. Transport Errors
- **stdio transport**: Default and most reliable for Claude Desktop
- **HTTP transport**: Available with `MCP_TRANSPORT=http` environment variable

### Debug Mode
```bash
# Enable debug logging
DEBUG=true bun run working-server.ts

# Test with specific query
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "SearchBun", "arguments": {"query": "timezone"}}}' | bun run working-server.ts
```

## 🔒 Security

- **Input Validation**: All parameters validated with Zod schemas
- **Command Sanitization**: Shell commands properly escaped
- **Dependency Auditing**: Regular security scans with `bun audit`
- **Access Control**: File system operations restricted to project directories

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-tool`
3. Commit changes: `git commit -am 'Add new Bun tool'`
4. Push to branch: `git push origin feature/new-tool`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Related Resources

- [Bun Documentation](https://bun.com/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Odds Protocol Monorepo](https://github.com/brendadeeznuts1111/windsurf-project)
- [Bun MCP Community](https://github.com/carlosedp/mcp-bun)

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the [Bun documentation](https://bun.com/docs)
- Review the [MCP specification](https://modelcontextprotocol.io/)
