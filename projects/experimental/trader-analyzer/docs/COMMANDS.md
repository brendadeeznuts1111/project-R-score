# Command Reference

Quick reference for all `bun run` commands. Run `bun run commands` to see this interactively.

## 🚀 Development

```bash
bun run dev                    # Start dev server with hot reload
bun run start                  # Start production server
bun run start:secure          # Start with security flags
bun run console               # Start Bun console with MLGS context
bun run dashboard:serve       # Start dashboard server
```

## 🧪 Testing

```bash
bun test                       # Run all tests
bun test --watch              # Run tests in watch mode
bun run test:verbose          # Run tests with verbose output
bun run test:telegram         # Run Telegram-specific tests
bun run test:performance      # Run performance tests
bun run bench                 # Run all benchmarks
bun run bench:csv             # CSV benchmark
bun run bench:position        # Position benchmark
```

## 🌐 API Testing & Fetch Utilities

```bash
# Bun Fetch API Examples
bun run examples/bun-fetch-api-examples.ts all        # Run all fetch examples
bun run examples/bun-fetch-api-examples.ts headers    # Test custom headers
bun run examples/bun-fetch-api-examples.ts proxy     # Test proxy configuration
bun run examples/bun-fetch-api-examples.ts wrapper   # Test fetch wrapper
bun run examples/bun-fetch-api-examples.ts optimized # Test optimized fetch
bun run examples/bun-fetch-api-examples.ts secure     # Test secure headers

# Bun Fetch Testing Utilities
bun run examples/bun-fetch-testing-utilities.ts test:proxy \
  <url> <proxy-url>                                    # Test simple proxy

bun run examples/bun-fetch-testing-utilities.ts test:proxy-auth \
  <url> <proxy-url> <user> <pass>                      # Test authenticated proxy

bun run examples/bun-fetch-testing-utilities.ts test:headers \
  <url> [--header="key:value"]                         # Test custom headers

bun run examples/bun-fetch-testing-utilities.ts bench:headers \
  <url> [--iterations=N]                               # Benchmark header performance
```

**Examples**:
```bash
# Test proxy
bun run examples/bun-fetch-testing-utilities.ts test:proxy \
  https://api.example.com http://proxy.local:8080

# Test authenticated proxy
bun run examples/bun-fetch-testing-utilities.ts test:proxy-auth \
  https://api.example.com http://proxy.local:8080 user pass

# Test custom headers
bun run examples/bun-fetch-testing-utilities.ts test:headers \
  https://httpbin.org/headers --header="X-Custom: value"

# Benchmark headers (1000 iterations)
bun run examples/bun-fetch-testing-utilities.ts bench:headers \
  https://httpbin.org/headers --iterations=1000
```

**See Also**:
- [Bun Fetch API Documentation](../config/.tmux-patterns-README.md#bun-fetch-api-extensions)
- [Examples README](../examples/README.md)

## ✅ Validation

```bash
bun run typecheck             # TypeScript type checking
bun run lint                  # Run linter
bun run validate:settings     # Validate VS Code settings
bun run validate:docs         # Validate documentation
bun run validate:manifest     # Validate UI manifest
bun run audit:validate        # Fast audit (pre-commit)
bun run audit:all             # Full audit (pre-push)
bun run audit:watch           # Watch mode audit
```

## ✨ Formatting

```bash
bunx @biomejs/biome format --write src/    # Format code
bunx @biomejs/biome format src/            # Check formatting
bunx @biomejs/biome check --write src/     # Lint and fix
```

## 📦 Build & Deploy

```bash
bun run build                 # Build project
bun run deploy:staging        # Deploy to staging
bun run deploy:worker:production  # Deploy worker to production
```

## 📊 Monitoring & Analytics

```bash
bun run dashboard             # Start dashboard CLI
bun run correlation           # Correlation engine CLI
bun run cpu-prof:test         # CPU profiling test
bun run cpu-prof:compare      # Compare profiles
```

## 🔬 Research & Analysis

```bash
bun run covert-steam          # Covert steam detection
bun run debug:graph           # Debug graph builder
bun run debug:anomaly         # Debug anomaly patterns
bun run research-*            # Various research scripts
```

## 📱 Telegram

```bash
bun run telegram              # Telegram CLI
bun run telegram:changelog    # Post changelog
bun run telegram:rss          # Post RSS feed
bun run telegram:monitor      # Monitor feeds
```

## 🔒 Security

```bash
bun run security              # Security CLI
bun run pentest               # Penetration testing
bun run sri                   # Subresource Integrity
```

## 🛠️ Utilities

```bash
bun run commands              # Show this command reference
bun run fix-settings          # Fix VS Code settings
bun run validate-settings     # Validate settings
bun run changelog             # Generate changelog
```

## 📚 Examples & Demos

```bash
# Bun Fetch API Examples
bun run examples/bun-fetch-api-examples.ts all        # All fetch examples
bun run examples/bun-fetch-api-examples.ts headers    # Custom headers demo
bun run examples/bun-fetch-api-examples.ts proxy      # Proxy demo

# Bun Fetch Testing Utilities
bun run examples/bun-fetch-testing-utilities.ts test:proxy <url> <proxy>
bun run examples/bun-fetch-testing-utilities.ts test:headers <url> [--header="key:value"]
bun run examples/bun-fetch-testing-utilities.ts bench:headers <url> [--iterations=N]

# Other Examples
bun run examples/telegram-golden-setup.ts setup      # Telegram setup
bun run examples/audit-websocket-client.ts            # WebSocket audit client
bun run examples/demos/demo-bun-utils.ts              # Bun utilities demo
bun run examples/demos/demo-html-rewriter.ts          # HTML rewriter demo
```

**See Also**: [Examples README](../examples/README.md)

## 🔍 Console Depth Debugging

Control nested object display depth for better debugging. See [docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md](../docs/7.0.0.0.0.0.0-CONSOLE-DEPTH-DEBUGGING.md) for details.

```bash
# Development (depth=7) - balanced visibility
bun run dev

# Deep debugging (depth=10) - complex structures
bun --console-depth=10 run src/index.ts

# Extreme debugging (depth=15) - maximum visibility
bun run debug:graph          # Graph structures
bun run debug:anomaly        # Anomaly patterns

# Verbose tests (depth=10)
bun run test:verbose

# Production (depth=5) - performance optimized
bun run start
```

**Depth Recommendations**:
- **5**: Production (performance)
- **7**: Development (default)
- **10**: Deep debugging
- **15**: Extreme debugging (graphs/anomalies)

## 🖥️ Terminal

```bash
bun run tmux:start            # Start tmux MLGS session
bun run tmux:help             # Show tmux help
bun run tmux:setup            # Setup terminal environment
```

## Quick Workflows

### Daily Development
```bash
bun run dev                   # Start dev server
# In another terminal:
bun test --watch              # Run tests in watch mode
```

### Before Committing
```bash
bun run audit:validate && bun test
```

### Before Pushing
```bash
bun run audit:all
```

### Full Validation
```bash
bun run validate:settings && \
bun run validate:docs && \
bun run typecheck && \
bun run lint
```

### Format & Lint
```bash
bunx @biomejs/biome format --write src/ && \
bunx @biomejs/biome check --write src/
```

## See All Commands

```bash
bun run commands              # Interactive command reference
bun run                       # List all scripts (Bun built-in)
```
