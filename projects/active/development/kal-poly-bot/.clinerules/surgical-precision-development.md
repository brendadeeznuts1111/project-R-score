# AGENTS.md - Surgical Precision Development

## Build/Lint/Test Commands

### Surgical Precision MCP (surgical-precision-mcp/)
- **Build**: `cd surgical-precision-mcp && bun build`
- **Test All**: `cd surgical-precision-mcp && bun test`
- **Single Test**: `cd surgical-precision-mcp && bun test __tests__/bun-v1.3.5-features.test.ts`
- **Benchmark**: `cd surgical-precision-mcp && bun run bench`

### Operation Surgical Precision (operation_surgical_precision/)
- **Build**: `cd operation_surgical_precision && bun install && bun build`
- **Test**: `cd operation_surgical_precision && bun test`
- **Benchmark**: `cd operation_surgical_precision && bun run surgical-precision-dashboard.bench.ts`

### Poly-Kalshi Arbitrage (poly-kalshi-arb/)
- **Build**: `cd poly-kalshi-arb && cargo build --release`
- **Test**: `cd poly-kalshi-arb && cargo test`
- **Run**: `cd poly-kalshi-arb && cargo run --release`

## Code Style Guidelines

### Imports & Modules
- Use ES modules with explicit imports: `import { func } from './module'`
- External deps first, then internal modules, then types
- Prefer named exports over default exports

### Types & Naming
- **Strict TypeScript**: Enable strict mode, avoid `any`
- **Files**: kebab-case (`component-coordinator.ts`)
- **Classes/Types**: PascalCase (`ComponentCoordinator`)
- **Variables/Functions**: camelCase (`componentStatus`)
- **Constants**: UPPER_SNAKE_CASE(`MAX_RETRY_COUNT`)

### Error Handling & Async
- Throw descriptive errors with context: `throw new Error('Failed to connect: ${reason}')`
- Use async/await over Promises, handle rejections with try/catch
- Avoid silent error swallowing

### Bun-Specific Patterns
- Use Bun native APIs: `Bun.stringWidth()`, `Bun.Terminal`, `Bun.Semaphore`
- Leverage `Bun.test` for testing with jest-compatible syntax
- Use environment variables via `Bun.env`

### Surgical Precision Standards
- **Zero-Collateral Operations**: No memory leaks, state corruption
- **13+ Benchmark Categories**: DNS, LSP, WebSocket, file I/O, compression, etc.
- **98.5%+ Success Rate**: Target for all test/benchmark suites
- **Sub-100ms Critical Operations**: Performance targets for hot paths
- **Team Color Coding**: Alice(#00CED1), Bob(#FFD700), Carol(#FF69B4), Dave(#00FF7F)

### Cursor Rules (from .clinerules/surgical-precision-development.md)
- Surgical precision development with zero-collateral operations
- 13+ benchmark categories with 98.5%+ success rates
- Team color coding and real-time monitoring
- Sub-100ms performance targets and concurrent testing
- Comprehensive documentation with performance metrics</content>
<parameter name="filePath">AGENTS.md