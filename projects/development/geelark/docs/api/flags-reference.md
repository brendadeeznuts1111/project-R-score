# Flags Reference Guide

## Complete Flag Documentation

### Bun Runtime Flags

These flags are processed by Bun before your script executes. They control the runtime environment, compilation, and execution behavior.

| Flag | Category | Description | Example |
|------|----------|-------------|---------|
| `--hot` | Development | Enable hot reloading for development | `bun --hot dev-hq-cli.ts server` |
| `--watch` | Development | Watch files and auto-restart on changes | `bun --watch dev-hq-cli.ts insights` |
| `--smol` | Performance | Use minimal runtime for faster startup | `bun --smol dev-hq-cli.ts health` |
| `--define <key=value>` | Compilation | Define compile-time constants | `bun --define NODE_ENV=prod dev-hq-cli.ts build` |
| `--drop <identifier>` | Compilation | Drop identifiers from output | `bun --drop console dev-hq-cli.ts run` |
| `--loader <ext:loader>` | Compilation | Custom file loaders | `bun --loader ".txt:txt" dev-hq-cli.ts` |
| `--filter <pattern>` | Filtering | Filter files to include | `bun --filter "*.ts" dev-hq-cli.ts test` |
| `--conditions <conditions>` | Exports | Export conditions for packages | `bun --conditions "development" dev-hq-cli.ts` |
| `--no-clear-screen` | Development | Don't clear screen on restart | `bun --no-clear-screen dev-hq-cli.ts server` |
| `--preserveWatchOutput` | Development | Preserve output between restarts | `bun --preserveWatchOutput dev-hq-cli.ts` |
| `--cwd <path>` | Execution | Set working directory | `bun --cwd ./src dev-hq-cli.ts cloc` |
| `--env-file <path>` | Environment | Load environment from file | `bun --env-file .env.local dev-hq-cli.ts` |
| `--config <path>` | Configuration | Use custom configuration file | `bun --config bun.config.ts dev-hq-cli.ts` |
| `--help` | Help | Show Bun help information | `bun --help` |
| `--version` | Version | Show Bun version | `bun --version` |

### Dev HQ CLI Flags

These flags are processed by the Dev HQ CLI application itself. They control output formatting, behavior, and command-specific options.

| Flag | Category | Description | Example |
|------|----------|-------------|---------|
| `--table` | Output Format | Display output in table format | `dev-hq-cli.ts insights --table` |
| `--json` | Output Format | Display output as JSON | `dev-hq-cli.ts git --json` |
| `--verbose` | Logging | Enable verbose logging output | `dev-hq-cli.ts test --verbose` |
| `--quiet` | Logging | Suppress non-error output | `dev-hq-cli.ts health --quiet` |
| `--timeout <ms>` | Execution | Set command timeout in milliseconds | `dev-hq-cli.ts run --timeout 30000` |
| `--output <path>` | Output | Save output to file | `dev-hq-cli.ts cloc --output stats.json` |
| `--format <type>` | Output Format | Custom output format | `dev-hq-cli.ts insights --format csv` |

## Command-Specific Flags

### insights Command
- `--table` - Show insights in table format
- `--json` - Show insights as JSON
- `--format <type>` - Custom format (csv, xml, etc.)

### git Command
- `--json` - Output git data as JSON
- `--verbose` - Show detailed git information
- `--quiet` - Minimal git output

### cloc Command
- `--json` - Output line counts as JSON
- `--output <path>` - Save to specified file
- `--format <type>` - Output format

### test Command
- `--timeout <ms>` - Test timeout duration
- `--verbose` - Detailed test output
- `--quiet` - Minimal test output

### docker Command
- `--json` - Docker info as JSON
- `--verbose` - Detailed container info
- `--quiet` - Minimal docker output

### health Command
- `--json` - Health data as JSON
- `--quiet` - Suppress status messages
- `--verbose` - Detailed health info

### server Command
- `--timeout <ms>` - Server startup timeout
- `--verbose` - Server logging
- `--quiet` - Silent server mode

### run Command
- `--timeout <ms>` - Command execution timeout
- `--verbose` - Show command output
- `--quiet` - Suppress command output

## Flag Precedence and Conflicts

### Precedence Rules
1. **Bun flags** are processed first and affect the runtime
2. **CLI flags** are processed after and affect application behavior
3. **Command-specific flags** take precedence over general CLI flags

### Conflict Resolution
- No conflicts between Bun and CLI flags (different systems)
- CLI flags may override each other (last one wins)
- Command-specific flags override general flags

## Advanced Usage Examples

### Development Workflow
```bash
# Development with hot reload and verbose output
bun --hot --watch dev-hq-cli.ts server --verbose

# Testing with environment variables and timeout
bun --define NODE_ENV=test dev-hq-cli.ts test --timeout 10000 --json
```

### Production Workflow
```bash
# Production build with minimal runtime
bun --smol --define NODE_ENV=production dev-hq-cli.ts run "npm run build" --quiet

# Analysis with custom output
bun --filter "*.ts" dev-hq-cli.ts cloc --output production-stats.json --json
```

### Debugging Workflow
```bash
# Debug with maximum verbosity
bun --preserveWatchOutput dev-hq-cli.ts insights --verbose --table

# Environment-specific configuration
bun --env-file .env.debug dev-hq-cli.ts health --json --verbose
```

## Flag Validation

### Bun Flag Validation
Bun validates its own flags and will show errors for:
- Invalid flag names
- Missing required values
- Conflicting flag combinations

### CLI Flag Validation
The Dev HQ CLI validates:
- Flag existence for each command
- Value types and ranges
- Logical flag combinations

### Error Handling
```bash
# Invalid Bun flag
bun --invalid-flag dev-hq-cli.ts insights
# Error: Unknown flag: --invalid-flag

# Invalid CLI flag
dev-hq-cli.ts insights --invalid-flag
# Error: Unknown flag: --invalid-flag for command: insights
```

## Performance Considerations

### Bun Flags Impact
- `--smol`: Faster startup, reduced memory
- `--hot`: Slightly slower startup, enables reloading
- `--watch`: Continuous monitoring, higher CPU usage
- `--define`: Compile-time, no runtime cost

### CLI Flags Impact
- `--json`: Faster processing than table formatting
- `--verbose`: More I/O overhead
- `--quiet`: Minimal I/O, fastest execution
- `--timeout`: No performance impact, just time limit

## Best Practices

1. **Use `--smol` for production** scripts when hot reload isn't needed
2. **Combine `--hot` and `--watch`** for active development
3. **Use `--json`** for programmatic consumption
4. **Use `--table`** for human-readable output
5. **Set appropriate timeouts** for long-running commands
6. **Use `--define`** for compile-time constants instead of runtime variables
