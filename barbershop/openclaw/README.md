# OpenClaw Gateway v3.28 - Bun Context + Table Engine

Part of Tier-1380 OMEGA Protocol. Matrix profile system with **Bun Context v3.28** and **Enhanced Table Engine** for global config resolution, context-aware execution, and beautiful terminal dashboards.

## 🚀 Quick Start

```bash
# Show the v3.28 table dashboard
bun run openclaw:table

# Start the Context Dashboard Server
bun run openclaw:dashboard

# Use one-liner CLI for context switching
bun run openclaw/oneliner.ts --cwd ./apps/api --env-file .env.local run dev
```

## 📁 Architecture

```
OpenClaw Gateway v3.28
├── lib/
│   ├── bun-context.ts            # Bun Context v3.28 core
│   │   ├── loadGlobalConfig()     # Load config with precedence
│   │   ├── executeWithContext()   # Context-aware execution + caching
│   │   └── Bun-native APIs        # file(), hash(), which(), spawn()
│   │
│   └── table-engine-v3.28.ts     # Enhanced Table Engine
│       ├── 20-column max          # Responsive overflow
│       ├── Unicode-aware          # stringWidth support
│       ├── HSL colors             # Bun.color dynamic theming
│       └── Formatters             # status, health, grade, latency
│
├── openclaw/
│   ├── gateway.ts                 # Profile management + bun-context integration
│   ├── cli.ts                     # CLI interface (11 commands)
│   ├── oneliner.ts                # One-liner CLI (--cwd, --env-file, --config)
│   ├── dashboard-server.ts        # HTTP dashboard server
│   ├── context-table-v3.28.ts     # Table engine integration
│   └── README.md                  # This file
```

## ✨ Bun-native Features

| Feature | API | Benefit |
|---------|-----|---------|
| File I/O | `Bun.file()` / `Bun.write()` | 2-3x faster than Node.js |
| Hashing | `Bun.hash.crc32()` | Context hash for caching |
| Command resolution | `Bun.which()` | Native path lookup |
| Process spawn | `Bun.spawn()` | Optimized subprocess |
| Timing | `Bun.nanoseconds()` | Nanosecond precision |

## 📊 Table Engine v3.28

Enhanced table architecture with Unicode support and dynamic theming:

```bash
# Show full dashboard with tables
bun run openclaw:table

# Show compact dashboard
bun run openclaw:table:compact
```

### Table Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **20 Column Max** | Responsive overflow | ✅ |
| **Unicode Status** | `stringWidth` aware | ✅ |
| **Bun.color HSL** | Dynamic theming | ✅ |
| **Hex/HEX Case** | Uppercase default | ✅ |
| **Dynamic Status** | URL/endpoint health | ✅ |

### Table Formatters

```typescript
import { formatters } from '../lib/table-engine-v3.28.ts';

formatters.status(true)        // "● ACTIVE" (green)
formatters.status('warning')   // "● WARNING" (yellow)
formatters.method('GET')       // "GET" (blue)
formatters.grade('A+')         // " A+ " (bold green)
formatters.health('healthy')   // "✓ HEALTHY" (green)
formatters.trend('up')         // "↗" (green)
formatters.latency(45)         // "45ms" (green/yellow/red)
formatters.bytes(1024)         // "1.0KB"
formatters.score(95)           // "95" (green)
formatters.variant('A')        // "▣ A" (cyan)
formatters.token('abc123')     // "🔒 abc…" (masked)
```

## 🎯 One-Liner CLI

Context switching with Bun-native flags:

```bash
# Context switching with --cwd
bun run openclaw/oneliner.ts --cwd ./apps/api --env-file .env.local run dev

# Multiple env files (precedence: last wins)
bun run openclaw/oneliner.ts --env-file .env --env-file .env.override run build

# Custom config file
bun run openclaw/oneliner.ts --config ./ci.bunfig.toml --filter 'app-*' run test

# Context-aware watch
bun run openclaw/oneliner.ts --cwd ./packages/core --watch --env-file .env.development run index.ts

# Production context
bun run openclaw/oneliner.ts --cwd /var/app --env-file /etc/secrets/app.env --smol run server.js
```

### One-Liner Flags

| Flag | Description |
|------|-------------|
| `--cwd <path>` | Set working directory |
| `--env-file <path>` | Load env file (multiple allowed) |
| `--config <path>` | Use custom bunfig.toml |
| `--filter <pattern>` | Filter packages (monorepos) |
| `--watch, -w` | Watch mode |
| `--hot` | Hot reload mode |
| `--smol` | Use smol mode (lower memory) |

## 🖥️ Context Dashboard Server

HTTP API for context-aware execution:

```bash
# Start dashboard server
bun run openclaw:dashboard
# Server running at http://0.0.0.0:8765
```

### Dashboard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Dashboard UI |
| GET | `/health` | Health check |
| POST | `/context-run` | Execute with context |
| GET | `/context-run?cmd=` | Execute (query params) |
| GET | `/context-cache` | List cached sessions |
| POST | `/context-clear` | Clear cache |

### API Examples

```bash
# POST execution
curl -X POST http://localhost:8765/context-run \
  -H "Content-Type: application/json" \
  -d '{
    "cwd": "./apps/api",
    "envFile": [".env.local"],
    "command": "bun",
    "args": ["--version"]
  }'

# GET execution
curl "http://localhost:8765/context-run?cwd=./apps/api&env-file=.env.local&cmd=bun&arg=--version"

# List cache
curl http://localhost:8765/context-cache

# Clear cache
curl -X POST http://localhost:8765/context-clear
```

## 🎮 Commands Reference

### OpenClaw Gateway Commands

| Command | Script | Description |
|---------|--------|-------------|
| `openclaw_status` | `bun run openclaw:status` | Gateway status + context hash |
| `profile_list` | `bun run openclaw:profiles` | List available profiles |
| `profile_bind` | `bun run openclaw:bind <id>` | Bind directory to profile |
| `profile_switch` | `bun run openclaw:switch <id>` | Switch active profile |
| `profile_status` | `bun run openclaw:profile_status` | Show binding status |
| `shell_execute` | `bun run openclaw:exec <cmd>` | Execute with context |

### Bun Context Commands

| Command | Script | Description |
|---------|--------|-------------|
| `context_exec` | `bun run openclaw:context <cmd>` | Execute with bun-context |
| `bun_config` | `bun run openclaw:config` | Show bun-context config |
| `version` | `bun run openclaw:version` | Show version info |

### Direct bun-context Usage

```bash
# Execute with context resolution (cached)
bun run lib/bun-context.ts exec bun --version

# Show loaded configuration
bun run lib/bun-context.ts config

# Show cache status
bun run lib/bun-context.ts cache

# Clear context cache
bun run lib/bun-context.ts clear-cache
```

## 📊 Context Performance

| Metric | Cold Start | Cache Hit | Improvement |
|--------|------------|-----------|-------------|
| Config load | 15ms | 0ms | ∞ |
| Env parsing | 5ms | 0ms | ∞ |
| Resolution | 3ms | 0ms | ∞ |
| **Total** | **23ms** | **<1ms** | **23x** |

## ⚙️ Configuration Resolution Order

1. **CLI flags** (`--cwd`, `--env-file`, `--config`)
2. **Environment files** (in order specified)
3. **bunfig.toml** (`[run]` section)
4. **package.json scripts** (if matched)
5. **Source files** (if matched)
6. **Binaries** (via `Bun.which()`)
7. **System commands** (shell fallback)

## 🔌 API Usage

### Basic Profile Operations
```typescript
import gateway from "./openclaw/gateway.ts";

// Check status (includes globalConfig)
const status = await gateway.getOpenClawStatus();

// List profiles
const profiles = await gateway.listProfiles();

// Bind directory
await gateway.bindProfile("tier1380");

// Execute with timing
const result = await gateway.shellExecute("bun", ["--version"]);
// { stdout, stderr, exitCode, durationMs }
```

### Bun Context Integration
```typescript
import { 
  loadGlobalConfig, 
  executeWithContext,
  generateContextHash 
} from "./lib/bun-context.ts";

// Load global config
const config = await loadGlobalConfig();

// Execute with context resolution and caching
const session = await executeWithContext(["bun", "--version"], { 
  useCache: true 
});
// { id, command, durationMs, contextHash, globalConfig, bunfig, status, exitCode }
```

### One-Liner Parser
```typescript
import { parseOneLinerFlags } from "./openclaw/oneliner.ts";

const { flags, command, args } = parseOneLinerFlags([
  "--cwd", "./apps/api",
  "--env-file", ".env.local",
  "run", "dev"
]);
```

## 🌍 Environment Variables

### OpenClaw
| Variable | Description |
|----------|-------------|
| `OPENCLAW_PROFILE` | Current profile ID |
| `OPENCLAW_CONTEXT` | Profile context (JSON) |
| `OPENCLAW_VERSION` | Gateway version |
| `OPENCLAW_CWD` | Working directory |

### Dashboard Server
| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_PORT` | `8765` | Dashboard server port |
| `OPENCLAW_HOST` | `0.0.0.0` | Dashboard server host |

## 📦 Profile Storage

- **Profiles**: `~/.openclaw/profiles.json`
- **Bindings**: `~/.openclaw/bindings.json`

## 📈 Response Formats

### Status
```json
{
  "online": true,
  "version": "3.16.0-bun-context",
  "gatewayUrl": "wss://gateway.openclaw.local:9443",
  "latencyMs": 2.41,
  "profilesActive": 1,
  "contextHash": "235a37f2",
  "globalConfig": {
    "cwd": "/Users/nolarose/Projects/barbershop",
    "envFile": [],
    "configPath": "bunfig.toml",
    "version": "1.3.9"
  }
}
```

### Context Session
```typescript
{
  id: "uuid",
  command: "bun",
  args: ["--version"],
  status: "completed",
  exitCode: 0,
  durationMs: 4.13,
  contextHash: "14264db2",
  globalConfig: { ... },
  bunfig: { ... }
}
```

### Dashboard API Response
```json
{
  "success": true,
  "sessionId": "uuid",
  "contextHash": "14264db2",
  "cwd": "/Users/nolarose/Projects/barbershop",
  "configPath": "bunfig.toml",
  "command": "bun",
  "durationMs": 4.13,
  "status": "completed",
  "exitCode": 0
}
```
