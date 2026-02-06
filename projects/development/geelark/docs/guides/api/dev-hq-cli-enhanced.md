# Dev HQ CLI - Enhanced Bun Syntax Implementation

## Overview

The enhanced Dev HQ CLI uses **Commander.js** with **Bun-native features** to provide comprehensive codebase analysis and automation. It follows the **perfect flag separation pattern** where Bun runtime flags are handled by Bun, and CLI-specific flags are handled by Commander.js.

## Architecture

### Perfect Flag Separation Pattern

```bash
bun [bun-flags] dev-hq-cli.ts [command] [cli-flags]
```

**Key Principle**: 
- **Bun flags** (--hot, --watch, --smol, --inspect) control **how** Bun runs the script
- **CLI flags** (--json, --table, --bun, --check-deps) control **what** the script does

## Features

### 🎯 Core Commands

1. **`insights`** (alias: `analyze`) - Comprehensive codebase analysis
2. **`git`** - Git repository analysis
3. **`cloc`** - Count lines of code
4. **`test`** - Run tests with coverage support
5. **`docker`** - Docker container insights
6. **`health`** - System health check
7. **`serve`** - Start Dev HQ server
8. **`run`** - Execute any command with monitoring

### 🚀 Bun-Specific Features

#### 1. Bun-Themed Output (`--bun`)
Displays beautiful ASCII-art styled output:

```bash
bun dev-hq-cli.ts insights --bun
```

```text
╔════════════════════════════════════════╗
║    🎯 Dev HQ Codebase Insights 🎯      ║
║         Powered by Bun 🚀               ║
╚════════════════════════════════════════╝
```

#### 2. Dependency Checking (`--check-deps`)
Uses `Bun.file()` and `Bun.which()` patterns to validate package.json dependencies:

```bash
bun dev-hq-cli.ts insights --check-deps
```

Checks:
- Installed packages in `node_modules`
- Missing dependencies
- Outdated packages (can be enhanced)

#### 3. Performance Metrics (`--perf`)
Shows Bun execution timing and memory usage:

```bash
bun dev-hq-cli.ts insights --perf
```

Output includes:
- Analysis time
- Memory used
- Files processed per second

#### 4. Bun.inspect.table Integration
Native Bun table formatting:

```bash
bun dev-hq-cli.ts insights --table
```

Uses `Bun.inspect.table()` for beautiful tabular output.

#### 5. File Operations with Bun.file()
Uses `Bun.file()` and `Bun.write()` for efficient file operations:
- Reading `package.json`
- Writing output files
- Checking file existence

## Usage Examples

### Basic Analysis

```bash
# Pretty output
bun dev-hq-cli.ts insights

# JSON output
bun dev-hq-cli.ts insights --json

# Table output
bun dev-hq-cli.ts insights --table

# Bun-themed ASCII output
bun dev-hq-cli.ts insights --bun
```

### Advanced Analysis

```bash
# Full analysis with dependency checking and performance metrics
bun dev-hq-cli.ts insights --check-deps --perf --bun

# Save to file
bun dev-hq-cli.ts insights --json --output analysis.json

# With Bun runtime flags
bun --hot --watch dev-hq-cli.ts insights --table
```

### Git Analysis

```bash
# Git repository insights
bun dev-hq-cli.ts git

# JSON format
bun dev-hq-cli.ts git --json

# Table format
bun dev-hq-cli.ts git --table
```

### Code Analysis (CLOC)

```bash
# Count lines of code
bun dev-hq-cli.ts cloc

# JSON output
bun dev-hq-cli.ts cloc --json
```

### Testing

```bash
# Run tests
bun dev-hq-cli.ts test

# With coverage
bun dev-hq-cli.ts test --coverage

# Watch mode (CLI flag, not Bun flag)
bun dev-hq-cli.ts test --watch

# With Bun hot reload (Bun flag)
bun --hot dev-hq-cli.ts test
```

### Health Checks

```bash
# System health check
bun dev-hq-cli.ts health

# JSON output (useful for CI/CD)
bun dev-hq-cli.ts health --json

# Table format
bun dev-hq-cli.ts health --table
```

### Server

```bash
# Start server on default port (3000)
bun dev-hq-cli.ts serve

# Custom port
bun dev-hq-cli.ts serve --port 8080

# With Bun debugging
bun --inspect dev-hq-cli.ts serve --port 3000
```

### Running Commands

```bash
# Execute any command
bun dev-hq-cli.ts run npm run build

# With metrics
bun dev-hq-cli.ts run npm run build --metrics

# Complex commands
bun dev-hq-cli.ts run -- echo "Hello" && echo "World"
```

## Bun Runtime Flags Integration

### Development Workflow

```bash
# Hot reload for development
bun --hot --watch dev-hq-cli.ts insights --table

# Low memory mode
bun --smol dev-hq-cli.ts analyze --check-deps

# Debugging
bun --inspect=9229 dev-hq-cli.ts serve --port 3000
```

### Production Workflow

```bash
# Production with environment
bun --env-file .env.prod dev-hq-cli.ts health --json

# Custom working directory
bun --cwd /path/to/project dev-hq-cli.ts insights

# With build definitions
bun --define NODE_ENV=production dev-hq-cli.ts test
```

## Implementation Details

### Codebase Analysis

The `analyzeCodebase()` function uses:
- **Bun.Glob** for efficient file pattern matching
- **Bun.file()** for file reading
- **Bun.write()** for output file writing
- Performance tracking with `performance.now()`
- Memory usage tracking with `process.memoryUsage()`

### Dependency Checking

The `checkDependencies()` function:
- Reads `package.json` using `Bun.file()`
- Checks `node_modules` existence
- Can be enhanced with `Bun.which()` for binary checking
- Validates installed vs declared dependencies

### Output Formats

1. **Pretty** (default) - Human-readable format
2. **JSON** - Machine-readable format
3. **Table** - Bun.inspect.table() formatted
4. **Bun-themed** - ASCII art with emojis

## Advanced Patterns

### CI/CD Integration

```bash
# Health check in CI
if ! bun dev-hq-cli.ts health --quiet; then
  echo "Health check failed"
  exit 1
fi

# Analysis in CI
bun dev-hq-cli.ts insights --json --output ci-analysis.json
```

### Docker/Container Patterns

```bash
# Docker insights
bun dev-hq-cli.ts docker --json

# Health check for containers
bun dev-hq-cli.ts health --quiet
```

### Development Scripts

```bash
# Watch mode for code analysis
bun --watch dev-hq-cli.ts insights --table

# Hot reload for server
bun --hot dev-hq-cli.ts serve --port 3000
```

## Performance Optimizations

### Bun-Specific Optimizations

1. **Glob Scanning**: Uses `Bun.Glob` for fast file pattern matching
2. **File Operations**: Uses `Bun.file()` instead of Node.js fs
3. **Memory Efficient**: Tracks memory usage for optimization
4. **Parallel Processing**: Uses async/await for concurrent operations

### Output Optimizations

1. **Lazy Loading**: Only loads data when needed
2. **Streaming**: Can stream large outputs
3. **Format Selection**: Choose format based on use case

## Testing the CLI

### Test All Commands

```bash
# Test insights
bun dev-hq-cli.ts insights --table

# Test git
bun dev-hq-cli.ts git --json

# Test health
bun dev-hq-cli.ts health

# Test with Bun flags
bun --smol dev-hq-cli.ts insights --check-deps --perf
```

### Test Flag Combinations

```bash
# Bun flags + CLI flags
bun --hot --watch dev-hq-cli.ts insights --table --json

# Multiple CLI flags
bun dev-hq-cli.ts insights --bun --check-deps --perf --output report.json
```

## Future Enhancements

Potential enhancements:

1. **Bun.which() Integration**: Check for system binaries
2. **Bun.$ Template**: Use Bun's shell template for commands
3. **Bun.build Integration**: Analyze bundle sizes
4. **Bun.test Integration**: Enhanced test runner integration
5. **Plugin System**: Extensible plugin architecture
6. **Configuration File**: Support for `.dev-hq.json` config

## Migration from Old CLI

The new CLI is backward compatible with flag-based commands:

**Old:**
```bash
bun dev-hq-cli.ts insights --table --json
```

**New (same):**
```bash
bun dev-hq-cli.ts insights --table --json
```

**New (enhanced):**
```bash
bun dev-hq-cli.ts insights --table --json --check-deps --perf --bun
```

## Troubleshooting

### Common Issues

1. **Command not found**: Ensure `bun` is in PATH
2. **Module not found**: Run `bun install`
3. **Permission denied**: Check file permissions
4. **Slow analysis**: Use `--smol` flag for low memory mode

### Debug Mode

```bash
# Enable verbose logging
bun dev-hq-cli.ts insights --verbose

# With Bun debugging
bun --inspect dev-hq-cli.ts insights --verbose
```

## Contributing

When adding new features:

1. Follow the flag separation pattern
2. Use Bun-native APIs when possible
3. Add proper error handling
4. Include performance tracking
5. Update documentation

## License

Same as main project.

