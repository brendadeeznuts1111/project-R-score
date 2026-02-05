# 🤖 AGENTS.md - Surgical Precision Development

## ⚡ Build/Lint/Test Commands
**Full Build**: `bun run build` | **All Tests**: `bun test` | **Type Check**: `bunx tsc --noEmit`
**Lint**: `bun run lint`, `bun run lint:fix` | **Single Test**: `bun test path/to/file.test.ts`
**Benchmark**: `bun run bench`

**Subprojects**: MCP(`cd surgical-precision-mcp && bun test`), Platform(`cd operation_surgical_precision && bun test`), Bot(`cd poly-kalshi-arb && cargo test`)

## 📝 Code Style Guidelines

**Imports**: External first, named exports, `import type` for types
**Formatting**: 2-space indent, 100 char lines, Prettier
**Types**: Strict TS, no `any`, `readonly` for immutable, interfaces over types
**Naming**: kebab-case files, PascalCase classes/types, camelCase vars/functions, UPPER_SNAKE constants
**Error Handling**: Descriptive errors, async/await, avoid silent failures
**Bun Patterns**: Use native APIs (`Bun.env`, `Bun.test`, `Bun.build`)

## 🗄️ Database Guidelines

**SQLite**: Use `bun:sqlite` (v3.51.1+) with EXISTS-to-JOIN optimizations
**Schema**: Define indexes for frequently queried columns
**Transactions**: Use explicit transactions for bulk operations
**Performance**: Leverage query planner improvements for subqueries

## ⚙️ Bun Runtime Configuration

**Run Commands**: Configure via `[run]` section in `bunfig.toml`
- `shell`: `"bun"` (default on Windows) or `"system"` (default elsewhere)
- `bun`: `true` to auto-alias `node` to `bun` in scripts
- `silent`: `true` to suppress command reporting in `bun run`

**Configuration Files**:
- `configs/bunfig.toml`: Main development configuration
- `configs/bunfig.production.toml`: Production-optimized settings
- `demo-app/bunfig.toml`: Demo application configuration
- `operation_surgical_precision/service_mesh/bunfig.toml`: Service mesh configuration

## 🎯 Cursor Rules
- Surgical precision development with zero-collateral operations
- 13+ benchmark categories with 98.5%+ success rates
- Team color coding and real-time monitoring
- Sub-100ms performance targets and concurrent testing
- Comprehensive documentation with performance metrics</content>
<parameter name="filePath">AGENTS.md