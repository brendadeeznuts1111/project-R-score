# Dev HQ Packages

This directory contains package templates and workspace generators for creating new Dev HQ projects.

## 📁 Directory Structure

```
packages/
├── README.md                    # This file
└── create/                     # Workspace template generator
    ├── index.ts                # Main generator script
    ├── package.json            # Package configuration
    └── template/               # Template files
        ├── README.md           # Template README
        ├── package.json        # Workspace package.json
        ├── bunfig.toml         # Bun configuration
        └── packages/           # Monorepo packages
            ├── cli/            # CLI package
            ├── core/           # Core package
            └── server/         # Server package
```

## 🚀 Creating a New Dev HQ Workspace

### Using `bun create` (when published)

```bash
bun create @dev-hq/dev-workspace my-project
```

### Local Development

```bash
# Run the generator directly
bun packages/create/index.ts @dev-hq dev-workspace my-project --force
```

### Options

- `--force` - Overwrite existing directory
- `--no-install` - Skip `bun install`
- `--no-git` - Skip git initialization
- `--dry-run` - Show what would be done without making changes
- `--open` - Open browser after setup

## 📦 Generated Workspace Structure

The template creates a monorepo workspace with:

### Packages

1. **`@dev-hq/cli`** - Command-line interface
   - Codebase insights
   - Health checks
   - Development server
   - Test runner

2. **`@dev-hq/core`** - Core functionality
   - Shared utilities
   - Common types
   - Base services

3. **`@dev-hq/server`** - HTTP/WebSocket server
   - API endpoints
   - Real-time features
   - WebSocket support

### Features

- ✅ Monorepo workspace structure
- ✅ TypeScript configuration
- ✅ Bun runtime optimized
- ✅ Feature flag support
- ✅ Hot reload development
- ✅ Comprehensive CLI
- ✅ Testing setup
- ✅ Documentation templates

## 🎯 Usage

### Development

```bash
# Start development server
bun run dev

# Run CLI
bun run insights

# Run tests
bun test --workspace
```

### CLI Commands

```bash
# Codebase insights
bun run insights --table

# Health check
bun run health

# Start server
bun run serve --hot --watch
```

## 📝 Template Customization

The template can be customized by modifying files in `packages/create/template/`:

- `template/package.json` - Workspace configuration
- `template/packages/*/package.json` - Individual package configs
- `template/packages/*/src/` - Source code templates
- `template/README.md` - Generated README template

## 🔗 Related Documentation

- [CLI Architecture](../packages/create/template/packages/cli/ARCHITECTURE.md)
- [CLI Reference](../packages/create/template/packages/cli/README.md)
- [Main README](../README.md)

