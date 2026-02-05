# CLAUDE.md

Project instructions for Claude Code. This file is automatically loaded as context.

## Project Overview

**Tier-1380** — A Bun-native CLI toolkit for color system management, audit governance, registry operations, and terminal profile tooling. Enforces Col-89 line width, structured commit messages, and Bun-first patterns across the codebase.

- **Runtime:** Bun >= 1.3.7 (enforced at startup via `Bun.semver.satisfies`)
- **Entry point:** `src/cli.ts`
- **Bins:** `tier1380`, `matrix`, `matrix-agent`, `nolarose-mcp-config`

## Development Commands

```bash
# Lint & format
bun run lint                 # Biome check (src/, .claude/, tools/, cli/, mcp-bun-docs/)
bun run lint:fix             # Biome auto-fix
bun run format               # Biome format
bun run typecheck            # TypeScript type checking

# Test
bun test                     # Main test runner (runs fix-test-paths.sh first)
bun run test:src             # Test src/ only
bun run test:claude          # Test .claude/ only
CLAUDECODE=1 bun test        # Quieter output for AI agents
bun test --bail --timeout=5000  # Exit on first failure

# CLI
bun run tier1380             # Main Tier-1380 CLI
bun run t1380                # Alias
bun run tier1380:bench       # Benchmarks
bun run matrix               # Matrix CLI

# Docs (mcp-bun-docs)
bun run docs:search -- "Bun.serve"
bun run docs:entry -- spawn --url
bun run docs:globals
bun run bun-docs             # CLI help
```

## Architecture

```
src/                    CLI layer — commands, validators, entry point
├── cli.ts              Main entry (bin: tier1380, matrix)
├── commands/           Frontmatter, links, openclaw, profile mgmt
└── lib/                CI detection, security, path resolution

lib/                    Core library — color system, enterprise, polish
├── src/                color/, core/, enterprise/
├── config/             TOML configs (color channels, color data)
├── polish/             UI components (onboarding, feedback, visual)
└── test/               36+ test files covering Bun APIs

cli/                    Tier-1380 CLI entry points
├── tier1380.ts         Main CLI dispatcher
└── tier1380-audit.ts   Audit subsystem

tools/                  Standalone analysis, benchmarking, monitoring (30+ files)
mcp-bun-docs/           SearchBun MCP server implementation
benchmarks/             Performance tests (19 files)
examples/               70+ examples (A/B testing, Bun features, build configs)
```

**Patterns:**
- Factory pattern for profile/color system construction
- Return `null`/default on errors, don't throw. Use `.catch(() => null)` for non-critical async
- Cross-runtime guard: `if (typeof Bun !== "undefined") { ... }`
- Tests use `bun:test` with `it()` not `test()`

## User Preferences

### Table Formatting

**NEVER use markdown tables in console output.** Use `Bun.inspect.table()` instead.

```typescript
Bun.inspect.table(data)                                      // All columns
Bun.inspect.table(data, ["col1", "col2"])                    // Filter columns
Bun.inspect.table(data, ["col1", "col2"], { colors: true })  // Filter + colors
```

**Gotcha:** Nested objects >1 level truncate to `[Object ...]`. Bun-only; guard with `typeof Bun !== "undefined"`.

### Conventions

- Semicolons required, double quotes for strings
- Variables: `camelCase`, Constants: `UPPER_SNAKE_CASE`, Types: `PascalCase`
- Commits: `[DOMAIN][COMPONENT:name][TIER:1380] description` with `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`
- Browser: `open -a "Google Chrome" <url>`

**Exit codes:**
```typescript
main().catch((err) => { console.error(err); process.exit(1); });
```

**Large files:** Use Grep with context (`-A`, `-B`) instead of Read for files >4000 tokens.

## Git Hooks & CI

### Hooks (`.claude/hooks/`)

**pre-commit** — Quality gates:
- TypeScript syntax validation (`bun build --no-bundle`)
- Biome lint/format on staged files
- Bun-native anti-pattern detection (blocks `express`, `axios`, `chalk`, `child_process`, `node:fs`)
- Secret scanning (AWS keys, tokens, private keys)
- Large file detection (>5MB warning)
- Col-89 enforcement

**commit-msg** — Structured format enforcement:
- Format: `[DOMAIN][COMPONENT:name][TIER:1380] description`
- Domains: `RUNTIME`, `SECURITY`, `PLATFORM`, `CLI`, `API`, `DB`, `UI`, `CONFIG`, `BUILD`, `TEST`, `DOCS`, `CORE`, `LIB`, `SCRIPTS`, `TOOLS`, `MCP`, `HOOKS`, `PKG`, etc.
- Types: `FIX`, `FEAT`, `REFACTOR`, `PERF`, `CHORE`, `DOCS`, `TEST`, `STYLE`, `BUILD`, `CI`, `REVERT`, `WIP`
- Optional tags: `[META]`, `[BUN-NATIVE]`, `[#REF:*]`

**pre-push** — Build validation:
- Blocks wrong lockfiles (package-lock.json, yarn.lock, pnpm-lock.yaml)
- Verifies bun.lock exists
- Optional test/build checks via `BUN_PREPUSH_TEST=1`, `BUN_PREPUSH_BUILD=1`

### CI (`.github/workflows/`)

**ci.yml** — Main pipeline:
- `lint-typecheck`: Biome + TypeScript
- `test`: Matrix (ubuntu/macos/windows x Bun 1.3.6/latest)
- `security-scan`: Audit + secret scanning
- `benchmark`: Performance benchmarks with hyperfine (main branch only)

**test-organization.yml** — 8 test groups (smoke, unit, integration, network, ci, performance, security, e2e) across Node 18.x/20.x

**check-links.yml** — Internal link checks on push, external weekly

## Linting & Formatting

Biome config (`biome.json`):
- **Line width:** 89 columns (Col-89, enforced everywhere)
- **Indent:** tabs, width 2
- **Semicolons:** always
- **Quotes:** double
- **Trailing commas:** all
- **Key rules:** `noConsole: warn`, `noDebugger: error`, `noExplicitAny: warn`, `noUnusedVariables: warn`
- **Scope:** src/, .claude/, tools/, cli/, mcp-bun-docs/

---

## Bun Quick Reference

> **Use Context7 MCP for detailed docs.** Below are essential patterns and gotchas only.

### Official Documentation Links

- [File API](https://bun.sh/docs/api/file-io) | [HTTP Server](https://bun.sh/docs/api/http) | [Shell ($)](https://bun.sh/docs/runtime/shell) | [Test Runner](https://bun.sh/docs/cli/test) | [Full API Index](https://bun.sh/docs/api/index)

**Quick Access (mcp-bun-docs):**
```bash
bun run docs:search -- "Bun.serve"   # searchBunDocs -> markdown
bun run docs:entry -- spawn --url    # getDocEntry -> URL
bun run docs:globals                  # Bun globals + API doc URL
```

**Tier-1380 CLI quick ref:**
```bash
bun run tier1380 -- color init --team=<name> --profile=<name>
bun run tier1380 -- color generate --wcag=aa --formats=all
bun run tier1380 -- color deploy --env=production --scale=3
bun run tier1380 -- color metrics --team=<name> --live
bun run tier1380 -- colors deploy <team> --profile <name>
bun run tier1380 -- terminal <team> <profile>
bun run tier1380 -- dashboard --team=<name> --profile=<name>
bun run t1380
bun run tier1380:bench
```

### Server

```typescript
const server = Bun.serve({
  port: 0,                    // Random port (default: $BUN_PORT, $PORT, or 3000)
  hostname: "127.0.0.1",      // Local only (default "0.0.0.0" exposes to network)
  fetch(req, server) {
    const url = new URL(req.url);
    return Response.json({ data });  // ALWAYS use Response.json() for JSON
  },
});
// server.port, server.stop(), server.reload({ fetch })
// Unix socket: Bun.serve({ unix: "/tmp/agent.sock", fetch(req) { ... } });
```

### File I/O

```typescript
const file = Bun.file("./data.json");
await file.text();            // string
await file.json();            // parsed
await Bun.write("out.txt", content);
await file.delete();          // Bun 1.2+
```

### Shell & Spawn

```typescript
import { $ } from "bun";
await $`ls -la | grep .ts`;
const out = await $`echo hello`.text();
await $`cmd`.quiet();                         // No output
const { exitCode } = await $`cmd`.nothrow();  // Don't throw

const proc = Bun.spawn(["node", "server.js"], { stdout: "pipe" });
await proc.exited;
```

### Testing

```typescript
import { describe, it, expect, mock, spyOn } from "bun:test";

describe("feature", () => {
  it("works", async () => {
    expect(value).toBe(expected);
    await expect(promise).resolves.toBe(value);
    expect(() => fn()).toThrow();
  });
});

const fn = mock(() => value);
spyOn(obj, "method").mockReturnValue(42);
```

### Secrets (OS Keychain)

```typescript
const SERVICE = "com.mycompany.myapp";
await Bun.secrets.set({ service: SERVICE, name: "token", value: "xxx" });
const token = await Bun.secrets.get({ service: SERVICE, name: "token" });
await Bun.secrets.delete({ service: SERVICE, name: "token" });
// Positional: await Bun.secrets.set(SERVICE, "token", "xxx");
```

**Gotcha:** Object form `({ service, name, value })` or positional `(service, name, value)` -- NOT `(options, value)`.

### Utilities

```typescript
Bun.deepEquals(a, b)              // Deep comparison (strict: 3rd arg)
Bun.randomUUIDv7()                // Time-sortable UUID
Bun.password.hash("pwd")          // Argon2id
Bun.password.verify("pwd", hash)
await Bun.sleep(1000)
Bun.which("node")                 // Find executable path
Bun.escapeHTML(userInput)         // XSS prevention
Bun.JSONL.parse(content)          // Parse newline-delimited JSON
Bun.JSON5.parse(content)          // JSON with comments/trailing commas
Bun.TOML.parse(content)          // Parse TOML config files
Bun.peek(promise)                 // Read settled value without await
Bun.semver.satisfies("1.3.7", ">=1.3.0")  // Semver range check
```

### Project-Critical Bun APIs

```typescript
// Inspect — use instead of console.log for structured output
Bun.inspect(value, { depth: 4, colors: true })
Bun.inspect.table(data, ["col1", "col2"], { colors: process.stdout.isTTY })
// Gotcha: maxArrayLength/maxStringLength IGNORED in Bun — manual truncation needed

// Col-89 enforcement (core invariant)
Bun.stringWidth(text, { countAnsiEscapeCodes: false })  // Visual width
Bun.wrapAnsi(text, 89, { wordWrap: true })              // Wrap to Col-89
Bun.stripANSI(coloredText)                               // Strip ANSI codes

// Timing
const t0 = Bun.nanoseconds();
await doWork();
console.log(`${(Bun.nanoseconds() - t0) / 1e6} ms`);

// Color conversion (used by Tier-1380 color system)
Bun.color("red", "hex");           // "#ff0000"
Bun.color([255, 0, 0], "hex");     // "#ff0000"
// Formats: hex | HEX | hex8 | HEX8 | number | rgb | rgba | hsl | ansi-*

// Stream consumers
await Bun.readableStreamToText(stream)   // -> string
await Bun.readableStreamToJSON(stream)   // -> parsed object
await Bun.readableStreamToBytes(stream)  // -> Uint8Array
```

### Tier-1380 Hardened Defaults

| Context | Preset | Rationale |
| ------- | ------ | --------- |
| Audit log rendering | `{ depth: 5, colors: false, compact: 3 }` + manual array truncate <=50 | Prevents huge logs, Col-89 violations |
| Col-89 enforcement | `stringWidth(..., {countAnsiEscapeCodes: false}) <= 89` + `wrapAnsi(..., 89, {wordWrap: true})` | Core invariant |
| deepEquals mode | `strict: true` for crypto/security; `false` for config/schema drift | Strict = zero-trust exact match |
| semver gate | `Bun.semver.satisfies(Bun.version, ">=1.3.7")` at startup | Ensures stringWidth GB9c, wrapAnsi fixes |
| table() row limit | Slice input to <=30-50 rows before `Bun.inspect.table` | Large tables break readability & Col-89 |

**Startup Guard:**

```typescript
const MIN_BUN = ">=1.3.7";
if (!Bun.semver.satisfies(Bun.version, MIN_BUN)) {
  console.error(`[TIER-1380] Bun ${Bun.version} < ${MIN_BUN} -> upgrade required`);
  process.exit(1);
}

function safeInspect(value: any, maxDepth = 6): string {
  const raw = Bun.inspect(value, { depth: maxDepth, colors: false, compact: 3 });
  return Bun.wrapAnsi(raw, 89, { wordWrap: true, trim: true });
}

function assertCol89(text: string, context = "unknown"): void {
  const w = Bun.stringWidth(text, { countAnsiEscapeCodes: false });
  if (w > 89) console.warn(`[COL-89 VIOLATION] ${context} width=${w}`);
}
```

### Cross-Runtime Guard

```typescript
if (typeof Bun !== "undefined") {
  // Bun APIs
} else {
  // Node.js fallback
}
```

---

## .claude Directory Map

### Source Code
- `src/` -- Main entry points
- `core/` -- Core library modules
- `api/` -- API server
- `sdk/` -- SDK implementations
- `shared/` -- Shared utilities
- `types/` -- TypeScript definitions

### Executables
- `bin/` -- Compiled binaries
- `scripts/` -- Dev/utility scripts (122 files)
- `tools/` -- Tool implementations

### Config
- `config/` -- App/build configs, package.json
- `hooks/` -- Git hooks (pre-commit, commit-msg, pre-push, prepare-commit-msg)
- `settings.json` -- Claude Code settings

### Content
- `docs/` -- Documentation
- `skills/` -- Skill definitions (.md)
- `examples/` -- Example code
- `commands/` -- CLI command docs

### Data
- `data/` -- Databases (*.db), reports
- `assets/` -- Static assets, binaries
- `benchmarks/` -- Performance tests

### Apps
- `apps/` -- Application builds
- `packages/` -- Monorepo packages

### Testing
- `tests/` -- Test files
- `test-results/` -- Test output

### Runtime (transient, gitignored)
- `projects/` -- Session data per project
- `debug/` -- Debug logs
- `file-history/` -- File versioning
- `paste-cache/` -- Clipboard cache
- `todos/`, `plans/`, `tasks/` -- Task tracking
- `session-env/` -- Session environments
- `statsig/` -- Feature flags
