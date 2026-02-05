# 🤖 Global Developer Guidelines (AGENTS.md)

**Scope**: Master technical guidelines for building, linting, testing, and adhering to "Surgical Precision" code standards across the platform.

---

## ⚡ Quick Reference: Common Commands

| Operation | Command | Primary Context |
|-----------|---------|-----------------|
| **Full Build** | `bun run build` | Project Root |
| **All Tests** | `bun test` | Project Root |
| **Type Check** | `bunx tsc --noEmit` | Project Root |
| **Start Matrix** | `bun services/matrix/matrix-mcp-server.ts` | `services/matrix/` |
| **Arb Bot** | `dotenvx run -- cargo run --release` | `poly-kalshi-arb/` |
| **Platform Dev** | `bun run precision-dev` | Project Root |

---

## 🛠️ Build/Lint/Test Commands

### General Commands
- **Type Check**: `bunx tsc --noEmit` in the project directory
- **Lint**: `bunx eslint .` or `bunx eslint path/to/file.ts`

### Subproject-Specific Commands

#### Surgical Precision Platform (operation_surgical_precision/)
- **Build**: `cd operation_surgical_precision && bun install && bun build`
- **Test**: `cd operation_surgical_precision && bun test`
- **Run Single Test**: `cd operation_surgical_precision && bun test path/to/file.test.ts`
- **Test with Pattern**: `cd operation_surgical_precision && bun test path/to/file.test.ts -- -t 'Test Name'`

#### Poly-Kalshi Arbitrage Bot (poly-kalshi-arb/)
- **Build**: `cd poly-kalshi-arb && cargo build --release`
- **Test**: `cd poly-kalshi-arb && cargo test`
- **Run**: `cd poly-kalshi-arb && dotenvx run -- cargo run --release`
- **Benchmarks**: `cd poly-kalshi-arb && cargo bench`
- **Dry Run**: `cd poly-kalshi-arb && DRY_RUN=1 dotenvx run -- cargo run --release`
- **Live Run**: `cd poly-kalshi-arb && DRY_RUN=0 dotenvx run -- cargo run --release`

#### Surgical Precision MCP (surgical-precision-mcp/)
- **Build**: `cd surgical-precision-mcp && bun install && bun build`
- **Test**: `cd surgical-precision-mcp && bun test`
- **Run Single Test**: `cd surgical-precision-mcp && bun test path/to/file.test.ts`

## Code Style Guidelines

### Imports
- External imports first, then internal
- Use named exports; prefer explicit imports over default exports
- `import type` for TypeScript type imports
- Prefer explicit paths and avoid relative imports where possible
- Group imports by: external libraries, internal modules, types

### Formatting
- Use Prettier for consistent formatting
- Run: `bunx prettier --write .` (respects repository config)
- Consistent indentation (2 spaces recommended)
- Max line length: 100 characters

### Types
- Enable strict TypeScript mode
- Avoid `any`; use explicit types/interfaces
- Use `readonly` for immutable properties
- Prefer interfaces over types for object shapes
- Use union types for variant values
- Leverage Bun's native types where available

### Naming Conventions
- **Files**: kebab-case (e.g., `component-coordinator.ts`)
- **Variables**: camelCase (e.g., `componentStatus`)
- **Types/Classes**: PascalCase (e.g., `ComponentCoordinator`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`)
- **Functions**: camelCase, descriptive names (e.g., `registerComponent`)

### Error Handling
- Throw meaningful errors with context
- Use custom error classes extending Error
- Propagate context through error messages
- Avoid silent error swallowing
- Use try/catch with specific error types

### Async Code
- Prefer async/await over Promises
- Handle rejections with try/catch
- Ensure all async operations are properly awaited
- Use Promise.all() for concurrent operations
- Avoid mixing async/await with .then/.catch

### Bun-Specific Patterns
- Use Bun's native APIs (URLPattern, fetch, WebSocket)
- Leverage Bun.test for testing with jest-compatible syntax
- Use Bun's SQLite integration for database operations
- Prefer Bun.build for compilation
- Use Bun.env for environment variables

## Special Rules

### Cursor Rules (from .clinerules/surgical-precision-development.md)
- Surgical precision development with zero-collateral operations
- 13+ benchmark categories with 98.5%+ success rates
- Team color coding and real-time monitoring
- Sub-100ms performance targets and concurrent testing
- Comprehensive documentation with performance metrics

### Copilot Rules
- None detected; add if present

### Project-Specific Conventions

#### Surgical Precision Platform
- Use ComponentCoordinator pattern for service orchestration
- Implement health checks and metrics collection
- Follow microservices architecture with SQLite state management
- Use Bun-native shell execution (BunShellExecutor)
- Implement disaster recovery with multi-region failover

#### Poly-Kalshi Arbitrage Bot
- Use dotenvx for environment variable management
- Implement circuit breaker pattern for risk management
- Use WebSocket connections for real-time market data
- Follow Rust async patterns with tokio
- Use lock-free data structures for performance
- Implement comprehensive logging with configurable levels

#### Testing Guidelines
- Use Bun.test with jest-compatible mocking
- Mock external dependencies appropriately
- Test both success and error paths
- Use fake timers for time-dependent tests
- Include integration tests for component interaction
- Run tests with `bun test` or `cargo test`

### Security Best Practices
- Never commit secrets or API keys
- Use environment variables for configuration
- Validate all external inputs
- Implement proper error boundaries
- Use HTTPS for all external communications
- Follow principle of least privilege

### Performance Considerations
- Use Bun-native APIs for optimal performance
- Implement efficient data structures
- Profile memory usage in tests
- Use concurrent execution where appropriate
- Monitor and optimize hot paths</content>
<parameter name="filePath">/Users/nolarose/Projects/kal-poly-bot/AGENTS.md
