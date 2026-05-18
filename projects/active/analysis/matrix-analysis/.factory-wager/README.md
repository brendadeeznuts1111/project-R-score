# FactoryWager Registry API Testing Profile

## Installation

1. **Source the profile directly:**
   ```bash
   source ~/.config/factory-wager-registry.profile
   ```

2. **Or add to your shell config:**
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   [[ "$TERM_PROGRAM" == "FactoryWager-Registry" ]] && source ~/.config/factory-wager-registry.profile
   ```

## Quick Start

```bash
# Load the profile
source ~/.config/factory-wager-registry.profile

# Test connectivity
fw-health

# List registry packages
fw-pkg-list

# Generate test markdown file
fw-gen-test-md my-test

# Test frontmatter extraction
fw-fm-test ~/.factory-wager/registry-tests/frontmatter/my-test.md
```

## Key Commands

### Health & Status
- `fw-health` - Registry health check
- `fw-ready` - Registry readiness status
- `fw-metrics` - Performance metrics
- `fw-validate` - Full profile validation

### Package Operations
- `fw-pkg-list` - List all packages
- `fw-pkg-search <query>` - Search packages
- `fw-pkg-publish` - Publish package to registry

### API Testing
- `fw-fm-test [file]` - Test frontmatter extraction
- `fw-header-gen <scope> <type> <title>` - Generate headers
- `fw-request <method> <endpoint> [data]` - Generic API request
- `fw-upload <file> [endpoint]` - File upload with progress

### MCP Dashboard
- `fw-mcp-status` - MCP GraphQL status
- `fw-mcp-telemetry` - CDN telemetry data

### Workspace Management
- `fw-cd` - Change to workspace directory
- `fw-logs` - Follow test logs
- `fw-clean` - Clean workspace files
- `fw-gen-test-md [name]` - Generate test markdown file

## Security Features

- **Zero-trust authentication** with JWT tokens
- **CSRF protection** with automatic token refresh
- **Secure cookie jar** for session testing
- **Request signing** with unique request IDs
- **Token storage** via Bun.secrets OS keychain

## Environment Variables

- `FACTORY_WAGER_ENV` - Environment identifier
- `BUN_CONFIG_REGISTRY` - Registry endpoint
- `BUN_CONFIG_TOKEN` - Authentication token
- `FW_API_BASE` - API base URL
- `FW_WORKSPACE` - Test workspace directory

## Performance Tuning

- **Bun runtime optimization** with dedicated cache
- **Multi-threaded operations** (8 worker threads)
- **Enhanced thread pool** (16 threads for I/O)
- **Debug mode** for registry operations

## Profile Structure

```
~/.factory-wager/registry-tests/
├── frontmatter/     # Test markdown files
├── headers/         # Generated headers
├── packages/        # Package test files
└── logs/           # Operation logs
```

The profile automatically validates connectivity and authentication on load, providing immediate feedback on registry status.
