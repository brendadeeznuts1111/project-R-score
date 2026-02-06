# AGENTS.md

> **Agent-Focused Documentation** for the Nolarose MCP Config Workspace

## Project Overview

This is a comprehensive **Bun-native development workspace** featuring:

- **Matrix Analysis Platform** - 197-column URLPattern performance analysis with compile-time caching
- **Environment Profile Management** - Secure profile system for managing development environments
- **Matrix Agent** - AI agent management system (migrated from clawdbot) with Telegram integration
- **Skills Registry** - Secure credential management using OS keychain integration (`Bun.secrets`)
- **Dev HQ CLI** - Development intelligence platform with feature flags, device management, and templates
- **MCP Server Ecosystem** - Model Context Protocol configuration for AI assistant integrations

**Repository:** `nolarose-mcp-config`
**Runtime:** Bun 1.3.6+
**License:** MIT

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Runtime | Bun | >= 1.3.6 | JavaScript/TypeScript execution |
| Language | TypeScript | 5.7+ | Type safety |
| Protocol | MCP (Model Context Protocol) | latest | AI assistant integration |
| Secrets | Bun.secrets | native | OS keychain integration |
| Auth | Bun.password | native | Argon2id password hashing |
| Testing | bun:test | native | Test runner |
| Tables | Bun.inspect.table() | native | Terminal output |

### Key Bun APIs Used

| API | Purpose | Performance |
|-----|---------|-------------|
| `Bun.peek()` | Sync promise inspection | 0-copy |
| `Bun.color()` | HSL/RGB/Hex conversion | Native |
| `Bun.hash.crc32()` | Hardware-accelerated hash | ~9 GB/s |
| `Bun.dns.prefetch()` | DNS cache warming | 150x faster |
| `Bun.nanoseconds()` | High-resolution timing | Native |
| `Bun.secrets.get/set()` | OS keychain access | Native |
| `Bun.password.hash()` | Argon2id hashing | ~3ms |
| `URLPattern` | Route matching | JIT compiled |

---

## Project Structure

```text
/
├── src/                          # Main source code
│   ├── cli.ts                    # CLI entry point
│   ├── commands/                 # Profile management commands
│   │   ├── profileCreate.ts
│   │   ├── profileDiff.ts
│   │   ├── profileExport.ts
│   │   ├── profileList.ts
│   │   ├── profileShow.ts
│   │   └── profileUse.ts
│   ├── lib/                      # Shared utilities
│   │   ├── output.ts
│   │   ├── profileLoader.ts
│   │   └── validators.ts
│   └── __tests__/                # Unit tests
│
├── .claude/                      # Claude-specific code (examples allowed in git)
│   ├── examples/enterprise/      # Demo scripts and examples
│   ├── scripts/                  # Utility scripts (1200+ files)
│   ├── core/                     # Core library modules
│   │   ├── terminal/             # Profile-Terminal Binding Manager
│   │   │   ├── ProfileTerminalBindingManager.ts  # Main manager
│   │   │   ├── cli.ts            # CLI interface
│   │   │   └── index.ts          # Module exports
│   │   ├── session/              # Session management
│   │   ├── rss/                  # RSS feed integration
│   │   └── shared/               # Shared utilities
│   ├── apps/                     # Application builds
│   ├── matrix/                   # Matrix analysis modules
│   └── packages/                 # Monorepo packages
│
├── skills/                       # Skills registry & Dev HQ CLI
│   ├── server/                   # Secure API servers
│   ├── scripts/                  # Setup scripts
│   ├── docs/                     # Documentation
│   └── r2+bun-production-stack-dashboardv1.02.21/  # Dashboard app
│
├── tools/                        # Standalone tools
│   ├── arm64/                    # ARM64 optimization toolkit
│   │   ├── guardian.ts           # ARM64 utility library
│   │   ├── wrap-migrator.ts      # AST migration CLI
│   │   ├── verify-arm64.ts       # Binary ARM64 verifier
│   │   ├── benchmark-arm64.ts    # Benchmark suite
│   │   └── arm64-demo.ts         # Interactive demo
│   └── bun-search.ts             # NPM registry search CLI
│
├── examples/                     # Bun feature demos
│   ├── bun-terminal-demo.ts      # PTY automation
│   ├── compile-time-flags-demo.ts # Feature detection
│   └── s3-content-disposition-demo.ts # S3 demo
│
├── docs/                         # Project documentation
│   ├── ROADMAP.md                # Development roadmap
│   └── release-notes.md          # Release notes
│
├── .matrix/                      # Matrix Agent (migrated from clawdbot)
│   ├── agent/
│   │   └── config.json           # Agent configuration
│   ├── logs/                     # Agent logs
│   ├── scripts/
│   │   └── health-check.ts       # Health monitoring
│   └── matrix-agent.ts           # Main agent CLI
│
├── .claude.json                  # Claude Code configuration
├── .mcp.json                     # MCP server definitions
├── bunfig.toml                   # Bun configuration
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript configuration
```

---

## Build and Test Commands

### Core Scripts

```bash
# Run the main 30-column matrix analysis
bun run matrix

# Profile management
bun run matrix:profile:use <name>      # Activate environment profile
bun run matrix:profile:list            # List available profiles
bun run matrix:profile:show <name>     # Show profile details
bun run matrix:profile:diff <a> <b>    # Compare two profiles
bun run matrix:profile:create <name>   # Create new profile

# Profile-Terminal Binding Manager (Tier-1380)
bun run terminal:init                  # Initialize binding manager
bun run terminal:status                # Display current status
bun run terminal:bind <profile>        # Bind current directory to profile
bun run terminal:unbind [path]         # Remove project binding
bun run terminal:switch <profile>      # Switch to different profile
bun run terminal:matrix                # Generate profile matrix
bun run terminal:broadcast             # Broadcast matrix to RSS/MCP
bun run terminal:list                  # List available profiles

# OpenClaw Integration (Tier-1380)
bun run matrix:openclaw:status         # Check OpenClaw infrastructure status
bun run matrix:openclaw:status:watch   # Continuous monitoring mode
bun run matrix:openclaw:health         # Run health checks
bun run matrix:openclaw:info           # Show system information
bun run openclaw:status                # Shorthand for status
bun run openclaw:health                # Shorthand for health
bun run openclaw:info                  # Shorthand for info

# Tier-1380 CLI (color | colors | terminal | dashboard)
bun run tier1380 -- color init --team=<name> --profile=<name>    # Initialize color system
bun run tier1380 -- color generate --wcag=aa --formats=all       # Enterprise palette
bun run tier1380 -- color deploy --env=production --scale=3       # Deploy to production
bun run tier1380 -- color metrics --team=<name> --live            # Monitor metrics
bun run tier1380 -- colors deploy <team> --profile <name>         # Deploy colors for team
bun run tier1380 -- terminal <team> <profile>                      # Launch colored terminal banner
bun run tier1380 -- dashboard --team=<name> --profile=<name>      # Open metrics dashboard (localhost:3001)

# Tier-1380 Audit CLI (Col-89 Compliance)
bun run tier1380:audit check <file>     # Col-89 violation scan with SQLite
bun run tier1380:audit css <file>       # LightningCSS minification
bun run tier1380:audit rss [url]        # RSS feed audit (Bun.xml)
bun run tier1380:audit dashboard        # Launch dashboard on :1380
bun run tier1380:audit db               # View violations database
bun run tier1380:audit clean            # Clear audit data

# Tier-1380 System Information
bun run tier1380:sysinfo                # Full system summary
bun run tier1380:sysinfo --json         # JSON output
bun run tier1380:sysinfo --health       # Component health check

# Tier-1380 Terminal Profile Manager (Bun.secrets)
bun run tier1380:terminal:profiles      # List profiles and secrets
bun run tier1380:terminal:profiles set API_KEY --value "xxx"  # Store secret
bun run tier1380:terminal:profiles get API_KEY               # Retrieve secret
bun run tier1380:terminal:switch prod   # Switch profile with secrets

# Bun One-Liners (Advanced Features)
# Import JSONC (JSON with comments)
bun -e 'const c=await import("./config.jsonc",{with:{type:"jsonc"}});console.log(c.default)'
# Import HTML as text
bun -e 'const h=await import("./template.html",{with:{type:"text"}});console.log(h.default.slice(0,89)+"…")'
# Build standalone executable
bun build --compile --target=bun ./app.ts --outfile app && ./app
# Verify WASM hash before dynamic import
bun -e 'const w=await Bun.file("./module.wasm").arrayBuffer();const h=Bun.hash.wyhash(Buffer.from(w));console.log("wasm-hash:",h.toString(16))'
# Load TOML with type attribute
bun -e 'const t=await import("./bunfig.toml",{with:{type:"toml"}});console.log(t.default.logLevel)'
# HTML bundler: check output hashes
bun -e 'const r=await Bun.build({entrypoints:["./index.html"],outdir:"./dist"});r.outputs.forEach(o=>console.log(o.kind,o.path.split("/").pop()))'

# Tier-1380 Registry Connector (Bun-native + R2 + Kimi Shell)
bun run tier1380:registry               # Check registry status (with DNS prefetch)
bun run tier1380:registry connect       # Connect to OMEGA registry
bun run tier1380:registry r2:status     # Check R2 connection
bun run tier1380:registry r2:upload <path> [key]   # Upload to R2 with CRC32
bun run tier1380:registry r2:download <key> [path] # Download from R2 with cache
bun run tier1380:registry r2:list [prefix]         # List R2 objects
bun run tier1380:registry r2:delete <key>          # Delete R2 object
bun run tier1380:registry sync [dir] [pattern]     # Sync registry (up/down/both)
bun run tier1380:registry sync:up [pattern]        # Sync local to R2
bun run tier1380:registry sync:down [pattern]      # Sync R2 to local
bun run tier1380:registry cache:stats   # Show cache statistics
bun run tier1380:registry cache:clear   # Clear local cache
bun run tier1380:registry benchmark     # Bun-native benchmark (CRC32, gzip, wyhash)
bun run tier1380:registry version:compare <v1> [v2]  # Compare versions (Bun.semver)
bun run tier1380:registry bin:check     # Detect binaries (Bun.which)
bun run tier1380:registry health:monitor [interval]  # Monitor health (default: 30s)
bun run tier1380:registry backup [path] # Create registry backup (tar.gz)
bun run tier1380:registry restore <file> # Restore registry from backup
bun run tier1380:registry config:validate <path>  # Validate config (Bun.deepEquals)
bun run tier1380:registry config:diff <c1> <c2>   # Compare configs (Bun.deepEquals)
bun run tier1380:registry password:hash [pwd]     # Hash password (Bun.password)
bun run tier1380:registry rss:generate  # Generate RSS feed (Bun.escapeHTML)
bun run tier1380:registry info          # Show Bun environment info
bun run tier1380:registry demo:peek     # Demo Bun.peek() async inspection
bun run tier1380:registry demo:path     # Demo path operations (path module)
bun run tier1380:registry demo:sleep [ms]     # Demo Bun.sleep() delays
bun run tier1380:registry demo:hmac [data]    # Demo HMAC (CryptoHasher)
bun run tier1380:registry demo:uuid [count]   # Demo UUIDv7 generation
bun run tier1380:registry demo:toml [file]    # Demo TOML parsing (Bun.TOML)
bun run tier1380:registry demo:transpile      # Demo code transpilation
bun run tier1380:registry demo:markdown       # Demo markdown parsing
bun run tier1380:registry demo:env      # Demo environment (Bun.env)
bun run tier1380:registry server:start [port]  # Start TCP server (Bun.listen)
bun run tier1380:registry http:start [port]    # Start HTTP/WebSocket (Bun.serve)
bun run tier1380:registry worker:spawn [task]  # Spawn worker with IPC
bun run tier1380:registry watch [pattern]      # Watch files (fs.watch)
bun run tier1380:registry shell:status  # Show Kimi shell integration status

# Tier-1380 Registry Validation & Compliance (JSON Schema + Bun.deepMatch)
bun run tier1380:registry:validate <tool> [args]  # Validate tool call against schema
bun run tier1380:registry:compliance [tenant]     # Calculate Col-89 compliance score
bun run tier1380:registry:export [json|csv]       # Export registry statistics
bun run tier1380:registry:list                    # List all registered MCP tools

# Tier-1380 SSE Live Alerts
bun run tier1380:sse:start [port]                 # Start SSE alert server
bun run tier1380:sse:test [tenant] [file] [line] [width]  # Send test alert

# Bun docs (mcp-bun-docs)
bun run docs:search -- "<query>"       # Search Bun docs (markdown)
bun run docs:entry -- <term> [--url]   # Curated entry (JSON or URL)
bun run docs:link -- [key]             # Reference URL or list keys
bun run docs:terms -- --count=N        # List curated terms (optional limit)
bun run docs:globals                   # Bun globals + API doc URL
bun run docs:xrefs -- <term>           # Cross-references for term
bun run docs:feedback                  # Upgrade-first / issue reporting
bun run docs:shop                      # Official Bun shop URL
bun run docs:blog                      # Bun blog URL
bun run docs:guides                    # Bun guides index URL
bun run docs:rss                       # Changelog + blog RSS URLs
bun run docs:repo                      # oven-sh/bun repo + releases
bun run docs:deps                      # Package manager + add dependency
bun run docs:compat                     # Node.js compatibility doc
bun run docs:reference                   # Bun reference (modules) index
bun run bun-docs                        # CLI help

# MCP (Model Context Protocol)
bun run mcp:list                       # List configured MCP servers
bun run mcp:status                     # Check MCP server status
bun run mcp:shell                      # Start unified shell bridge
bun run mcp:health                     # Run OpenClaw health flow
bun run mcp:migrate                    # Run legacy migration flow
bun run mcp:flow <name>                # Execute MCP flow
bun run mcp:flow:list                  # List available flows
bun run mcp:inspector                  # MCP inspector UI

# Shortcuts
bun run tbind <profile>                # Shortcut for terminal:bind
bun run tstatus                        # Shortcut for terminal:status
bun run tmatrix                        # Shortcut for terminal:matrix
bun run tbroadcast                     # Shortcut for terminal:broadcast
bun run t1380                          # Shortcut for tier1380

# OpenClaw Shortcuts
bun run ocstatus                       # One-shot status
bun run ocwatch                        # Continuous monitoring
bun run ochealth                       # Raw health metrics
bun run ocinfo                         # System information

# Enterprise CLI tools
bun run bytes                          # Byte analysis CLI
bun run jsonl                          # JSONL processing CLI
bun run routes                         # Route analysis CLI

# Shortcuts
bun run m                              # matrix:cli
bun run b                              # bytes
bun run j                              # jsonl
bun run r                              # routes
```

### Testing

```bash
# Run all tests
bun test

# Quiet output (AI-friendly)
CLAUDECODE=1 bun test

# Exit on first failure with timeout
bun test --bail --timeout=5000
```

### Migration

```bash
# Run wrap-ansi migration
bun run migrate
bun run migrate:dry       # Dry run
bun run migrate:verbose   # Verbose output
```

### Benchmarks

```bash
# ARM64 benchmarks
bun run benchmark
bun run benchmark:output

# Tier-1380 color (palette generation benchmark)
bun run tier1380:bench   # color generate --wcag=aa --formats=all

# Spawn performance monitoring
bun run spawn:monitor    # Full validation + benchmark
bun run spawn:check      # Quick system check
bun run spawn:bench      # Extended benchmark (500 iterations)

# Verification
bun run verify:arm64

# Demo
bun run demo
```

### MCP Servers

```bash
# Inspect MCP servers
bun run mcp:inspector

# Run RSS MCP server
bun run mcp:rss
```

---

## Code Style Guidelines

### Syntax Conventions

| Element | Style | Example |
|---------|-------|---------|
| Variables | camelCase | `myVariable` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Types | PascalCase | `UserProfile` |
| Strings | Double quotes | `"hello"` |
| Semicolons | Required | `const x = 1;` |

### Console Output

**NEVER use markdown tables in console output.** Use `Bun.inspect.table()` instead:

```typescript
// ✅ Correct
console.log(Bun.inspect.table(data));
console.log(Bun.inspect.table(data, ["col1", "col2"]));
console.log(Bun.inspect.table(data, ["col1", "col2"], { colors: true }));

// ❌ Incorrect - don't use markdown tables in CLI output
```

### Error Handling

Return `null` or default values instead of throwing:

```typescript
// ✅ Correct
const result = await fetch(url).catch(() => null);
if (!result) return defaultValue;

// ❌ Avoid throwing for non-critical errors
```

### Exit Codes

```typescript
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

### Commits

Use conventional commits with co-author attribution:

```text
feat(matrix): add DNS prefetch optimization

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

---

## Testing Instructions

### Test Structure

Tests use `bun:test` with `describe` and `it()` (not `test()`):

```typescript
import { describe, it, expect, mock, spyOn } from "bun:test";

describe("feature", () => {
  it("should work correctly", async () => {
    expect(value).toBe(expected);
    await expect(promise).resolves.toBe(value);
    expect(() => fn()).toThrow();
  });
});
```

### Mocking

```typescript
const fn = mock(() => value);
spyOn(obj, "method").mockReturnValue(42);
```

### onTestFinished Hook

Use `onTestFinished` for cleanup or assertions that must run **after** all `afterEach` hooks complete. This is useful for final verification or resource cleanup that depends on earlier teardown.

```typescript
import { describe, it, afterEach, onTestFinished, expect } from "bun:test";

describe("feature", () => {
  it("runs cleanup after afterEach", () => {
    const calls = [];

    afterEach(() => {
      calls.push("afterEach");
    });

    onTestFinished(() => {
      calls.push("onTestFinished");
      // afterEach has already run
      expect(calls).toEqual(["afterEach", "onTestFinished"]);
    });

    // test body...
  });

  it.serial("async cleanup at the very end", async () => {
    onTestFinished(async () => {
      await new Promise((r) => setTimeout(r, 10));
      // ...close DB connections, stop servers, etc.
    });

    // test body...
  });
});
```

**Important:**
- Runs only inside a test (not in `describe` or preload)
- Supports async and done-style callbacks
- Not supported in concurrent tests; use `test.serial` instead or remove `test.concurrent`

### Test Files Location

- `src/__tests__/*.test.ts` - Unit tests for src/
- `.claude/core/*.test.ts` - Core module tests
- `.claude/scripts/dashboard/*.test.ts` - Dashboard tests

---

## Security Considerations

### Credential Management

- **NEVER** commit credentials to git
- Use `Bun.secrets` for all sensitive data (stored in OS keychain)
- Use UTI-style service names: `com.company.app`

```typescript
const SERVICE = "com.mycompany.myapp";
await Bun.secrets.set({ service: SERVICE, name: "token", value: "xxx" });
const token = await Bun.secrets.get({ service: SERVICE, name: "token" });
```

### Security Headers

All API responses should include:

```typescript
new Response(JSON.stringify(data), {
  headers: {
    "Content-Security-Policy": "default-src 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  },
});
```

### Input Validation

Always validate URLPattern inputs for security vectors:

```typescript
// Check for path traversal
if (pattern.includes("../")) return { error: "Path traversal detected" };

// Check for SSRF
if (hostname?.match(/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2|3)/))
  return { error: "SSRF risk detected" };
```

---

## MCP Server Configuration

The project uses multiple MCP servers defined in `.mcp.json`:

| Server | Purpose | Environment Variables |
|--------|---------|----------------------|
| `bun` | Bun runtime integration | `DISABLE_NOTIFICATIONS=true` |
| `context7` | Documentation search | - |
| `filesystem` | File system access | - |
| `sequential-thinking` | Problem-solving | - |
| `puppeteer` | Browser automation | `HEADLESS=true` |
| `rss` | RSS feed reader | `RSS_MAX_ITEMS=50`, `RSS_CACHE_TTL=300` |
| `github` | GitHub integration | `GITHUB_PERSONAL_ACCESS_TOKEN` |

---

## Profile Management

Profiles are stored in `~/.matrix/profiles/*.json`:

```json
{
  "name": "dev",
  "version": "1.0.0",
  "created": "2026-01-29T20:00:00Z",
  "author": "user",
  "description": "Development environment",
  "environment": "development",
  "env": {
    "NODE_ENV": "development",
    "API_URL": "http://localhost:3000"
  }
}
```

### Variable Resolution

Profiles support `${VAR}` references that are resolved at activation time:

```typescript
// Profile env
{ "DATABASE_URL": "postgres://${DB_USER}:${DB_PASS}@localhost/db" }

// After resolution (with DB_USER=admin, DB_PASS=secret)
{ "DATABASE_URL": "postgres://admin:secret@localhost/db" }
```

---

## Profile-Terminal Binding Manager (Tier-1380)

The ProfileTerminalBindingManager provides advanced profile and terminal management with per-project, per-path session handling.

### Features

- **Per-Project Profile Binding** - Automatically activate profiles based on project directory
- **Per-Path Session Management** - Track and manage terminal sessions by working directory
- **Terminal Lifecycle Management** - Register, activate, and cleanup terminal sessions
- **RSS Feed Integration** - Publish matrix updates to RSS feeds for dashboard consumption
- **MCP Server Notifications** - Real-time notifications via MCP protocol

### Usage

```typescript
import { ProfileTerminalBindingManager } from "./.claude/core/terminal";

const manager = new ProfileTerminalBindingManager();

// Initialize with RSS and MCP adapters
await manager.initialize({
  rssFeed: new BunRSSFeedAdapter(),
  mcpServer: new BunMCPServerAdapter(),
});

// Bind current directory to a profile
manager.bindCurrentDirectory("dev", { autoActivate: true });

// Switch profiles
await manager.switchProfile("prod");

// Broadcast matrix update
await manager.broadcastMatrixUpdate();

// Display status
manager.displayStatus();
```

### Matrix Update Broadcasting

The `broadcastMatrixUpdate()` method publishes to:

1. **RSS Feed** (`~/.matrix/feeds/tier-1380-matrix.json`)
   - Channel: `tier-1380-matrix`
   - Content: Full profile-terminal matrix
   - Checksum: Wyhash of content for integrity

2. **MCP Server** (`~/.matrix/mcp/bun___profiles_matrix_realtime.json`)
   - URI: `bun://profiles/matrix/realtime`
   - Data: `{ profiles, terminals, bindings, col93Integrity, timestamp, checksum }`

### Session Management

```typescript
// Create a session for current terminal
const terminal = manager.terminalManager.activeTerminal;
if (terminal) {
  const session = manager.sessionManager.createSession(
    terminal.id,
    "user-123",
    "admin",      // role
    "1380"        // tier
  );
}
```

---

## Matrix Agent (Migrated from Clawdbot)

The Matrix Agent is an AI agent management system integrated with the Matrix Analysis Platform. It was migrated from `clawdbot` v2026.1.17-1 and renamed to align with the project's Matrix/Tier-1380 theme.

### Directory Structure

```text
~/.matrix/
├── agent/
│   └── config.json          # Agent configuration
├── logs/
│   └── agent-health.jsonl   # Health check logs
├── scripts/
│   └── health-check.ts      # Health monitoring script
└── matrix-agent.ts          # Main agent CLI
```

### Configuration

The agent configuration is stored in `~/.matrix/agent/config.json`:

```json
{
  "name": "matrix-agent",
  "version": "1.0.0",
  "agents": {
    "defaults": {
      "model": { "primary": "openrouter/minimax/minimax-m2.1" },
      "workspace": "/Users/nolarose"
    }
  },
  "channels": {
    "telegram": { "enabled": true }
  },
  "gateway": {
    "port": 18789,
    "mode": "local"
  },
  "integration": {
    "profiles": { "enabled": true },
    "terminal": { "enabled": true },
    "tier1380": { "enabled": true },
    "mcp": { "enabled": true }
  }
}
```

### Commands

```bash
# Initialize agent
bun run agent:init

# Show agent status
bun run agent:status

# Run health checks
bun run agent:health

# Migrate from legacy clawdbot
bun run agent:migrate

# Profile commands (via agent)
bun run agent:profile list
bun run agent:profile use <name>
bun run agent:profile show <name>

# Tier-1380 commands (via agent)
bun run agent:tier1380 color init --team=<name> --profile=<name>
```

### Direct Usage

```bash
# Using the global command
matrix-agent status
matrix-agent health
matrix-agent migrate

# Or via bun
bun ~/.matrix/matrix-agent.ts status
```

### Integration Points

The Matrix Agent integrates with:

1. **Profile System** (`~/.matrix/profiles/`)
   - Reads and manages environment profiles
   - Syncs with terminal binding manager

2. **Tier-1380 CLI** (`cli/tier1380.ts`)
   - Color system management
   - Team hierarchy
   - Dashboard operations

3. **Terminal Manager** (`.claude/core/terminal/`)
   - Profile-terminal bindings
   - Session management

4. **Terminal Manager** (`.claude/core/terminal/`)
   - Profile-terminal bindings
   - Session management

5. **MCP Servers** (`.mcp.json`)
   - Bun runtime
   - Documentation search
   - File system access

6. **OpenClaw Gateway** (`~/.openclaw/`)
   - WebSocket gateway on port 18789
   - Tailscale HTTPS access
   - Bun Secrets token auth

### Migration from Clawdbot

To migrate from the legacy `clawdbot` installation:

```bash
# Run migration script
bun run agent:migrate

# Or manually
bun ~/.matrix/matrix-agent.ts migrate
```

This will:
- Copy relevant configuration from `~/.clawdbot/clawdbot.json`
- Create a migration marker at `~/.matrix/.migrated-from-clawdbot`
- Preserve agent settings, model preferences, and channel configs

After migration, the legacy `~/.clawdbot` directory can be safely removed.

---

## Tier-1380 OpenClaw Skill

Enhanced skill for OpenClaw/Matrix Agent infrastructure management.

### Location
`~/.kimi/skills/tier1380-openclaw/`

### Features
- **Unified Status Display** - All components in one view
- **Gateway Management** - Start/stop/restart OpenClaw Gateway
- **Matrix Agent Control** - Agent status and configuration
- **Telegram Bot Tools** - Bot status and webhook management
- **Migration Utilities** - Legacy clawdbot migration helpers

### Commands

```bash
# Status & Monitoring
ocstatus                      # One-shot status
ocwatch                       # Continuous monitoring
ochealth                      # Raw health metrics

# Component Details
ocgateway                     # Gateway status
ocmatrix                      # Matrix Agent status
octelegram                    # Telegram Bot status
ocinfo                        # System information

# Integration CLI
bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts status
bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts health
```

### Aliases (in .zshrc)
```bash
alias ocstatus='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts status'
alias ocinfo='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts info'
alias ochealth='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts health'
alias ocgateway='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts gateway'
alias ocmatrix='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts matrix'
alias octelegram='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts telegram'
alias ocmigrate='bun ~/.kimi/skills/tier1380-openclaw/scripts/openclaw-integration.ts migrate'
```

---

## Bun-Specific Patterns

### Cross-Runtime Guard

```typescript
if (typeof Bun !== "undefined") {
  // Bun-specific code
} else {
  // Node.js fallback
}
```

### File I/O

```typescript
const file = Bun.file("./data.json");
const content = await file.text();
const json = await file.json();
await Bun.write("out.txt", content);
await file.delete(); // Bun 1.2+
```

### S3/R2 Storage

```typescript
import { s3 } from "bun";
await s3.write("file.pdf", data, {
  contentDisposition: 'attachment; filename="report.pdf"'
});
const file = s3.file("key");
await file.exists();
```

### SQLite

```typescript
import { Database } from "bun:sqlite";
const db = new Database("app.sqlite");
db.query("SELECT * FROM users").all();

// Auto-cleanup with using
{ using db = new Database("app.sqlite"); }
```

### Shell Commands

```typescript
import { $ } from "bun";
await $`ls -la | grep .ts`;
const out = await $`echo hello`.text();
await $`cmd`.quiet();              // No output
const { exitCode } = await $`cmd`.nothrow();  // Don't throw
```

---

## Tier-1380 One-Liner Cheatsheet

Production-hardened Bun-native one-liners for compliance and auditing:

```bash
# Col-89 gate (returns exit code 1 on violation)
bun -e 'const f=Bun.argv[1]||"README.md";const s=await Bun.file(f).text();const v=s.split("\n").filter(l=>Bun.stringWidth(l,{countAnsiEscapeCodes:false})>89).length;console.log(`${v} violations`);process.exit(v>0?1:0)' README.md

# CRC32 hardware acceleration throughput test
bun -e 'const b=Buffer.alloc(1<<20),t=performance.now();for(let i=0;i<100;i++)Bun.hash.crc32(b);console.log(`Throughput: ${(100/(performance.now()-t)*1000).toFixed(0)} MB/s`)'

# SQLite violation count
bun -e 'import{Database}from"bun:sqlite";console.log((new Database("./data/tier1380.db").query("SELECT COUNT(*) as c FROM violations").get()as any).c)'

# LightningCSS size diff (if installed)
bun -e 'import{transform}from"lightningcss";const c=await Bun.file("app.css").text();const r=transform({code:Buffer.from(c),minify:true});console.log(((1-r.code.length/c.length)*100).toFixed(1)+"% saved")'

# Bun.xml RSS parse (v1.3.7+ experimental)
bun -e 'const x=(Bun as any).xml?.parse?.(await(await fetch("https://bun.sh/rss.xml")).text());console.log(x?.rss?.channel?.item?.[0]?.title||"N/A")'

# Bun.build introspection (async function)
bun -e 'console.log(typeof Bun.build)' # → "function"

# String width with GB9c Indic support (Bun v1.3.7+)
bun -e 'console.log(Bun.stringWidth("क्षत्रिय",{countAnsiEscapeCodes:false}))' # → 6

# Nanosecond precision timing
bun -e 'const s=Bun.nanoseconds();await new Promise(r=>setTimeout(r,100));console.log(`${(Bun.nanoseconds()-s)/1e6}ms`)'

# Security scan for bad file extensions
bun -e 'const bad=new Set([".exe",".dll",".sh"]);const d="./dist";for await(const f of new Bun.Glob("**/*").scan(d)){const e=f.slice(f.lastIndexOf("."));if(bad.has(e))console.log(`⚠️ Illegal: ${f}`)}'

# Package integrity check (Wyhash)
bun -e 'const pkg=process.argv[3];const h=Bun.hash.wyhash(Buffer.from(pkg)).toString(16);console.log(`Package: ${pkg}\nAudit: ${h}`)' -- prisma

# View recent executions (tier1380-exec)
bun -e 'import{Database}from"bun:sqlite";const d=new Database("./data/tier1380.db");console.table(d.query("SELECT * FROM executions ORDER BY ts DESC LIMIT 5").all())'
```

---

## Related Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview and features |
| `CLAUDE.md` | Bun API quick reference |
| `docs/ROADMAP.md` | Development roadmap and progress |
| `docs/SPAWN-OPTIMIZATION.md` | Bun spawn performance guide and validation |
| `skills/README.md` | Skills registry documentation |
| `skills/docs/dev-hq-cli.md` | Dev HQ CLI full documentation |
| `.kimi/skills/tier1380-openclaw/SKILL.md` | OpenClaw/Matrix Agent integration |
| `.kimi/skills/tier1380-omega/SKILL.md` | OMEGA protocol and deployment |
| `.kimi/skills/tier1380-infra/SKILL.md` | Infrastructure management |
| `.kimi/skills/tier1380-commit-flow/SKILL.md` | Commit governance and validation |
| `.kimi/skills/tier1380-mcp/SKILL.md` | MCP integration and flows |
| `cli/tier1380-audit.ts` | Col-89 audit CLI with SQLite |
| `docs/release-notes.md` | Bun runtime release notes |
| `mcp-bun-docs/lib.ts` | Bun docs search, curated entries, reference links (searchBunDocs, getDocEntry, BUN_REFERENCE_LINKS) |

---

## Environment Requirements

- **Bun:** >= 1.3.6
- **Git:** >= 2.40 (recommended)
- **OS:** macOS 14+ (recommended), Linux, Windows WSL
- **RAM:** 4GB minimum, 8GB+ recommended
- **Disk:** 1GB+ for dependencies

---

*This document is maintained for AI coding agents. For human contributors, see README.md.*
