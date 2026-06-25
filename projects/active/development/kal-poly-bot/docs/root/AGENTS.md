# 🤖 AGENTS.md - Surgical Precision Development

## ⚡ Build/Lint/Test Commands

**Full Build**: `bun run build` (Project Root)
**All Tests**: `bun test` (Project Root)
**Type Check**: `bunx tsc --noEmit` (Project Root)
**Single Test**: `bun test path/to/file.test.ts`
**Benchmark**: `bun run bench` (Subprojects)

**Subprojects**:
- Surgical Precision MCP: `cd surgical-precision-mcp && bun test` or `cd surgical-precision-mcp && bun run cli.ts test`
- Operation Platform: `cd operation_surgical_precision && bun test`
- Poly-Kalshi Bot: `cd poly-kalshi-arb && cargo test`

**Single Test Examples**:
- Surgical Precision MCP: `cd surgical-precision-mcp && bun test __tests__/bun-utils.test.ts`
- Surgical Precision MCP (with CLI): `cd surgical-precision-mcp && bun run cli.ts test __tests__/bun-utils.test.ts`

## 🔍 AI Agent & MCP Tools

### **Ripgrep MCP CodeSearch** - #bunwhy = Speed
**Ultra-fast AI agent codebase search using ripgrep** (37x faster than grep)

**Start MCP Server**: `bun run mcp:start`
**Health Check**: `bun run mcp:health`
**Prove Speed**: `bun run bunwhy:speed`
**Quick Search**: `bun run search:lightning "query"`

**API Endpoints**:
- `POST /mcp/codesearch` - Search codebase with context
- `POST /mcp/speed` - Performance benchmarks vs grep
- `GET /health` - Server health check
- `GET /mcp` - MCP discovery for AI agents

**Performance**: <50ms AI agent responses, 70k+ matches/sec throughput

**Example Usage**:
```bash
# AI agent integration
curl -X POST http://localhost:8787/mcp/codesearch \
  -H "Content-Type: application/json" \
  -d '{"query":"Bun\\.Terminal","type":"ts","context":2}'

# Speed benchmark
bun run bunwhy:speed  # Shows 6-8x speedup on YOUR codebase
```

**MCP Protocol**: v1.0 compatible with Bun's AI agent infrastructure

## 📝 Code Style Guidelines

**Imports**: External first, named exports, `import type` for types
**Formatting**: Prettier, 2-space indent, 100 char lines
**Types**: Strict TS, no `any`, `readonly` for immutable, interfaces over types
**Naming**: kebab-case files, PascalCase classes, camelCase vars, UPPER_SNAKE constants
**Error Handling**: Descriptive errors, async/await, avoid silent failures
**Bun Patterns**: Use native APIs (`Bun.env`, `Bun.test`, `Bun.build`)

## 🎯 Cursor Rules (from .clinerules/surgical-precision-development.md)
- Surgical precision development with zero-collateral operations
- 13+ benchmark categories with 98.5%+ success rates
- Team color coding and real-time monitoring
- Sub-100ms performance targets and concurrent testing
- Comprehensive documentation with performance metrics

**Copilot Rules**: None detected</content>
<parameter name="filePath">AGENTS.md