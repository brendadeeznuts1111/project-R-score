# Dev HQ CLI - Complete Command Reference

Version 2.0.0 | Built with Bun runtime

## Quick Start

```bash
# Using bunx (recommended)
bunx dev-hq --help

# Basic usage
bunx dev-hq insights                    # Analyze codebase
bunx dev-hq insights --table            # Table format
bunx dev-hq insights --json             # JSON format
bunx dev-hq health                      # System health check

# Local development
bun bin/dev-hq-cli.ts insights --table
```

## Commands

### `insights` - Comprehensive Codebase Analysis

**Aliases:** `analyze`, `i`

Analyzes your entire codebase and provides detailed insights.

```bash
bunx dev-hq insights [options]
bunx dev-hq analyze [options]
bunx dev-hq i [options]
```

**Output Formats:**
- `--table` - Table format using `Bun.inspect.table` (default)
- `--json` - JSON format for programmatic use
- `--csv` - CSV format for spreadsheet analysis
- `--markdown` - Markdown format for documentation

**Examples:**
```bash
bunx dev-hq insights --table
bunx dev-hq insights --json > report.json
bunx dev-hq insights --csv > analysis.csv
bunx dev-hq insights --markdown > README.md
```

**Output includes:**
- Total files, lines, and size
- Language breakdown
- Health score (0-100%)
- Top files by lines of code
- Performance metrics (with `--perf`)
- Dependency analysis (with `--check-deps`)
- Bundle analysis (with `--analyze`)

### `health` - System Health Check

**Aliases:** `h`

Comprehensive system health analysis.

```bash
bunx dev-hq health [options]
bunx dev-hq h [options]
```

**Checks:**
- Bun runtime availability
- Git installation
- Docker installation
- Node.js modules status
- System resources (memory, uptime)

**Example:**
```bash
bunx dev-hq health --verbose
```

### `test` - Run Tests

**Aliases:** `t`

Execute tests with optional coverage.

```bash
bunx dev-hq test [options]
bunx dev-hq t [options]
```

**Options:**
- `--coverage` - Run tests with coverage report
- `--watch` - Enable watch mode for continuous testing

**Example:**
```bash
bunx dev-hq test --coverage
```

### `git` - Git Repository Analysis

**Aliases:** `g`

Provides comprehensive Git repository insights.

```bash
bunx dev-hq git [options]
bunx dev-hq g [options]
```

**Features:**
- Commit history analysis
- Branch information
- Repository size and statistics
- Contributor insights

### `cloc` - Count Lines of Code

**Aliases:** `c`

Counts lines of code across your project.

```bash
bunx dev-hq cloc [options]
bunx dev-hq c [options]
```

**Metrics:**
- Total lines of code
- Language breakdown
- File count by type
- Code vs comments ratio

### `docker` - Docker Container Insights

**Aliases:** `d`

Analyze Docker containers and images.

```bash
bunx dev-hq docker [options]
bunx dev-hq d [options]
```

**Features:**
- Running containers status
- Image analysis
- Resource usage metrics
- Container health checks

### `serve` - Start Dev HQ Server

**Aliases:** `s`

Start the Dev HQ web server.

```bash
bunx dev-hq serve [options]
bunx dev-hq s [options]
```

**Options:**
- `--port <port>` - Specify port number (default: 3000)

**Example:**
```bash
bunx dev-hq serve --port 8080
```

### `run` - Execute Commands

**Aliases:** `r`

Execute any command with Dev HQ monitoring.

```bash
bunx dev-hq run <command> [options]
bunx dev-hq r <command> [options]
```

**Options:**
- `-m, --metrics` - Capture performance metrics

**Examples:**
```bash
bunx dev-hq run "npm run build" --metrics
bunx dev-hq run "bun test" --metrics
```

## Global Options

These options can be used with any command:

### Output Formatting
- `--json` - Output in JSON format
- `--table` - Output in table format
- `--format <format>` - Specify format: `json|table|pretty`

### Performance & Debugging
- `--perf` - Show Bun execution timing
- `--verbose` - Enable verbose logging
- `--quiet` - Quiet mode (minimal output)
- `--timeout <ms>` - Command timeout (default: 30000)

### Bun-Specific Features
- `--bun` - Enable Bun-themed ASCII output
- `--check-deps` - Validate package.json dependencies

### Output Management
- `--output <file>` - Save output to file
- `--help` - Show help information
- `--version` - Show version information

## Flag Separation Pattern

The CLI follows Bun's flag separation pattern:

```bash
# Bun flags (before script) | Script | CLI flags (after command)
bun --hot --watch dev-hq-cli.ts insights --table --json
#    └────Bun Flags────┘ └──Script──┘ └─Cmd─┘ └──CLI Flags───┘
```

**Bun Flags:**
- `--hot` - Enable hot module replacement
- `--watch` - Watch mode for file changes
- `--smol` - Smaller binary footprint
- `--dump` - Dump AST for debugging

**CLI Flags:**
- `--table`, `--json`, `--csv`, `--markdown`
- `--perf`, `--verbose`, `--quiet`
- `--check-deps`, `--output`

## Command Aliases

| Command | Aliases |
|---------|---------|
| `insights` | `analyze`, `i` |
| `health` | `h` |
| `test` | `t` |
| `git` | `g` |
| `cloc` | `c` |
| `docker` | `d` |
| `serve` | `s` |
| `run` | `r` |

## Auto-Correction

The CLI auto-corrects common typos:

```bash
bunx dev-hq insight    # Corrects to "insights"
bunx dev-hq helth      # Corrects to "health"
bunx dev-hq teste      # Corrects to "test"
```

## Usage Examples

### Basic Analysis
```bash
# Quick project overview
bunx dev-hq insights

# Detailed analysis with timing
bunx dev-hq insights --perf --verbose

# Export to different formats
bunx dev-hq insights --json > report.json
bunx dev-hq insights --csv > analysis.csv
bunx dev-hq insights --markdown > docs.md
```

### Development Workflow
```bash
# Check system health
bunx dev-hq health

# Validate dependencies
bunx dev-hq insights --check-deps

# Run tests with coverage
bunx dev-hq test --coverage

# Start development server
bunx dev-hq serve --port 3000
```

### CI/CD Integration
```bash
# JSON output for automation
bunx dev-hq insights --json --quiet > ci-report.json

# Health check for deployment
bunx dev-hq health --json

# Performance monitoring
bunx dev-hq run "npm run build" --metrics --json > build-metrics.json
```

### Advanced Usage
```bash
# Combine multiple options
bunx dev-hq insights --table --perf --check-deps --output analysis.txt

# Custom timeout and output
bunx dev-hq git --json --timeout 60000 --output git-analysis.json

# Quiet mode with metrics
bunx dev-hq run "npm run test" --metrics --quiet
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment (development/production) |
| `DEV_HQ_TIMEOUT` | Default timeout override |
| `DEV_HQ_OUTPUT_DIR` | Default output directory |
| `DEV_HQ_DEBUG` | Enable debug mode |

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - Command timeout
- `4` - System check failed

## Configuration

### Configuration Files

The CLI looks for configuration in:
1. `devhq.config.json` in project root
2. `devhq` section in `package.json`
3. Environment variables

### Example Configuration

```json
{
  "devhq": {
    "defaultFormat": "table",
    "timeout": 30000,
    "checkDeps": true,
    "outputDir": "./reports"
  }
}
```

## Integration Examples

### GitHub Actions
```yaml
- name: Code Analysis
  run: |
    bunx dev-hq insights --json --quiet > analysis.json
    bunx dev-hq health --json --quiet > health.json
```

### npm Scripts
```json
{
  "scripts": {
    "analyze": "dev-hq insights --table",
    "health": "dev-hq health",
    "analyze:json": "dev-hq insights --json > analysis.json",
    "serve": "dev-hq serve --port 3000"
  }
}
```

### Makefile
```makefile
analyze:
	dev-hq insights --table --output analysis.txt

health:
	dev-hq health --verbose

ci:
	dev-hq insights --json --quiet > ci-report.json
```

## Troubleshooting

### Command Not Found
```bash
# Use npx/bunx instead of global install
bunx dev-hq --help
```

### Permission Denied
```bash
# Make executable
chmod +x bin/dev-hq-cli.ts

# Or use bun directly
bun bin/dev-hq-cli.ts --help
```

### Timeout Errors
```bash
# Increase timeout
bunx dev-hq insights --timeout 60000

# Or disable timeout
bunx dev-hq insights --timeout 0
```

## Performance Tips

1. **Use JSON format** for programmatic processing
2. **Enable quiet mode** in CI/CD pipelines
3. **Adjust timeout** for large codebases
4. **Use specific commands** instead of general analysis
5. **Cache results** for repeated analysis

---

Built with [Bun](https://bun.sh) for maximum performance.
