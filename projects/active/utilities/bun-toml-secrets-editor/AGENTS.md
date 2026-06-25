---
name: bun-toml-secrets-editor
description: Bun-native TOML secrets editor with CLI enhancements, security scanning, and enterprise features
---

# Bun-Native TOML Secrets Editor

A production-grade TOML editor that enforces Bun's environment variable expansion syntax, Bun.secrets API integration, and URLPattern security scanning. Includes comprehensive CLI enhancements with process management, console reading, progress indicators, table formatting, and smart command validation.

## Technology Stack

- **Runtime**: Bun (>=1.0.0)
- **Language**: TypeScript 5.9.3
- **Build**: Bun's native bundler with compile support
- **Testing**: Bun's built-in test runner
- **Dependencies**: fast-xml-parser, mitata

## Project Structure

```text
├── src/
│   ├── cli/              # CLI implementations
│   │   ├── duoplus-cli.ts       # Main DuoPlus CLI
│   │   ├── duoplus-cli-native.ts # Native Bun Shell CLI
│   │   ├── kimi-cli.ts          # Kimi integration CLI
│   │   └── index.ts             # Matrix CLI entry
│   ├── secrets/          # Secrets management
│   ├── rss/              # RSS feed processing
│   ├── server/           # Server implementations
│   ├── config/           # Configuration resolvers
│   ├── enterprise/       # Enterprise features
│   ├── security/         # Security hardening
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript definitions
├── tests/                # Test files
├── examples/             # Example scripts
├── config/               # Configuration files
└── docs/                 # Documentation
```

## Build Commands

```bash
# Development builds
bun run build:dev              # Development build with INTERACTIVE feature

# Production builds
bun run build                  # Community build
bun run build:premium          # Premium build with all features
bun run build:all              # All platforms

# Cross-platform builds
bun run build:linux            # Linux x64 & arm64
bun run build:darwin           # macOS x64 & arm64
bun run build:win32            # Windows x64
```

## Test Commands

```bash
bun test                       # Run all tests
bun run test:watch             # Watch mode
bun run test:coverage          # With coverage
bun run test:unit              # Unit tests only
bun run test:integration       # Integration tests
```

## CLI Usage

### DuoPlus CLI
```bash
bun run cli --help             # Show help
bun run duoplus --list         # List devices
bun run duoplus --status       # Show status
bun run duoplus:native         # Native shell mode
```

### Kimi CLI
```bash
bun run kimi:security          # Security scan
bun run kimi:connections       # Connection test
bun run kimi:optimize          # Performance optimization
```

### Matrix CLI
```bash
bun run matrix --help          # Matrix CLI help
bun run matrix:profile         # Profile management
bun run matrix:security        # Security features
```

## Code Style Guidelines

- **Formatting**: Use consistent indentation (tabs)
- **Imports**: Group by external, internal, then relative
- **Types**: Always use explicit TypeScript types
- **Error Handling**: Use try/catch with specific error types
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Comments**: JSDoc for public APIs, inline for complex logic

## Environment Variables

Required:
- `DUOPLUS_API_TOKEN` - API authentication token

Optional:
- `DUOPLUS_ENV` - Environment (development/production)
- `DEBUG` - Enable debug mode
- `LOG_LEVEL` - DEBUG|INFO|WARN|ERROR
- `TZ` - Timezone

## Security Considerations

- Secrets use Bun.secrets API for secure storage
- URLPattern validation for security scanning
- Header casing preservation for HTTP requests
- Input validation on all CLI arguments
- Audit logging via SQLite

## Testing Strategy

- **Unit tests**: Core functionality in `tests/`
- **Integration tests**: End-to-end workflows
- **Type checking**: `bun run typecheck`
- **Benchmarks**: `bun run bench`

## Feature Flags

Build-time features via `bun:bundle`:
- `INTERACTIVE` - PTY-based interactive editing
- `PREMIUM` - Premium enterprise features
- `COMMUNITY` - Basic community features

## Kimi CLI Integration

This project is optimized for use with Kimi Code CLI. Key integration points:

1. **AGENTS.md** - This file helps Kimi understand the project
2. **KIMI_INTEGRATION.md** - Detailed integration documentation
3. **Kimi CLI** - Custom CLI for Kimi-specific operations (`bun run kimi:*`)

## Common Development Tasks

```bash
# Type check
bun run typecheck

# Run benchmarks
bun run bench

# Profile performance
bun run profile:cpu
bun run profile:heap

# Validate configs
bun run config:validate

# RSS server (if applicable)
bun run rss:start
```

## Project Maintenance

### Keeping Root Directory Clean

The root directory should only contain essential configuration and documentation files:

**Allowed in root:**
- `package.json`, `bun.lock` - Package configuration
- `tsconfig.json` - TypeScript configuration  
- `README.md`, `AGENTS.md` - Documentation
- `Makefile` - Build automation
- `.gitignore`, `.gitattributes` - Git configuration
- `.env.production`, `.secretsrc.json` - Environment/config
- `flake.nix`, `shell.nix` - Nix development environment
- `.observatory-policy.toml` - Observatory policy

**Should NOT be in root:**
- `*.cpuprofile` → Move to `profiles/`
- `*-export.json` → Move to `temp/` or delete
- `*.heapsnapshot`, `*.log` → Move to `logs/` or `temp/`
- `reorganize-codebase.sh` → Delete after use
- `.DS_Store` → Delete (auto-generated by macOS)

**Validation:**
```bash
# Check root directory cleanliness
./scripts/validate-root-clean.sh
```

## Notes for AI Agents

- Always check `package.json` for available scripts before suggesting commands
- Use Bun APIs preferentially over Node.js equivalents
- Respect feature flags when modifying code
- Maintain type safety - run `bun run typecheck` after changes
- Consider cross-platform compatibility (Linux, macOS, Windows)
- Test CLI changes with `--help` flag first
- **Keep root directory clean** - follow the guidelines above
