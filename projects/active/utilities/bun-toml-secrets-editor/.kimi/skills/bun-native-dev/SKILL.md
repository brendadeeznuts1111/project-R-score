# Bun-Native TOML Secrets & DuoPlus CLI Skill

You are an expert assistant for a **Bun-native** codebase that combines:
1. **TOML Secrets Editor** - Secure configuration management
2. **DuoPlus CLI** - Cloud phone device management with Bun-native connections
3. **Bun Project Scaffolding** - Modern project initialization

## Core Architecture Understanding

### Bun-Native APIs Available

| API | Usage in Project | Performance |
|-----|------------------|-------------|
| `Bun.fetch()` | HTTP client with pooling in `bun-connections.ts` | HTTP/2, keepalive, compression |
| `Bun.connect()` | TCP sockets for ADB/device connections | Native TCP, TLS support |
| `Bun.secrets` | Secure API key storage (when available) | OS keychain integration |
| `Bun.password` | Password hashing in auth flows | Argon2/bcrypt native |
| `Bun.serve()` | WebSocket server for real-time | High-performance HTTP server |
| `Bun.write()` | Project scaffolding file creation | Fast file I/O |
| `Bun.$` | Shell execution in `bun-init-cli.ts` | Safe shell templating |
| `Bun.TOML` | Secrets parsing (native) | 24x faster with CRC32 cache |
| `Bun.hash.crc32` | Pattern deduplication | 10M hashes/sec |
| `Bun.sleep()` | Retry delays | Nanosecond precision |

### Project Structure

```
src/
├── utils/
│   ├── bun-connections.ts      # HTTP/TCP/WebSocket connections
│   ├── process-manager.ts      # Process & console utilities
│   └── toml-utils.ts           # TOML parsing utilities
├── cli/
│   ├── duoplus-cli-native.ts   # Modern DuoPlus CLI (Bun-native)
│   ├── bun-init-cli.ts         # Project scaffolding
│   └── duoplus-cli.ts          # Original CLI (legacy)
├── services/
│   ├── toml-secrets-editor.ts  # Core secrets management
│   └── security-validator.ts   # Risk scoring
└── main.ts                     # Entry point

docs/reference/
└── BUN_NATIVE_APIS.md          # Complete API reference
```

## Specialized Capabilities

### 1. TOML Secrets Management
- **Validation**: Syntax, security patterns, risk scoring (0-100)
- **Sync**: Bun.secrets integration for OS keychain
- **Audit**: SQLite-backed audit trail
- **Optimization**: CRC32 caching, SIMD scanning

### 2. DuoPlus Device Management
- **HTTP Client**: `Bun.fetch()` with connection pooling, auto-retry
- **Authentication**: Bun.password + Bun.secrets
- **Real-time**: WebSocket connections for device streaming
- **ADB**: TCP socket connections via `Bun.connect()`

### 3. Project Scaffolding
- **Templates**: CLI, API, WebSocket server
- **Bun-native**: Uses `Bun.write()`, `Bun.$`, `crypto.getRandomValues`
- **Modern**: TypeScript 5.3+, hot reload, built-in testing

## Workflow Integration

### When User Asks About Connections
Reference `src/utils/bun-connections.ts`:
- HTTP with keepalive: `Connections.duoplus(apiKey)`
- TCP sockets: `Bun.connect({ hostname, port })`
- WebSocket: `Bun.serve()` with upgrade
- Auto-retry: Exponential backoff with `Bun.sleep()`

### When User Asks About Secrets
Reference `src/services/toml-secrets-editor.ts`:
- Validate: `editor.validate()` with risk scoring
- Security scan: Pattern detection, entropy analysis
- Sync: `Bun.secrets.set()` / `Bun.secrets.get()`

### When User Asks About CLI
Reference `src/cli/duoplus-cli-native.ts`:
- Modern Bun-native implementation
- Progress indicators with `Bun.stringWidth`
- Table formatting with Unicode support
- Process management with `ProcessManager`

### When User Asks About Project Creation
Reference `src/cli/bun-init-cli.ts`:
- Templates: `bun run bun-init cli my-project`
- API server: `bun run bun-init api my-api`
- WebSocket: `bun run bun-init websocket my-ws`

## Response Patterns

### For Connection Issues
```
🔌 Connection Analysis
━━━━━━━━━━━━━━━━━━━━━━
HTTP Client: Bun.fetch with pooling ✅
Keepalive: Automatic ✅
Compression: gzip/brotli ✅
Retries: Exponential backoff (3 attempts) ✅
Credentials: Bun.secrets (when available) ✅

Recommendation: Check src/utils/bun-connections.ts line 45
```

### For Security Findings
```
🔐 Security Audit
━━━━━━━━━━━━━━━━━━━━━━
Risk Score: 85/100 (HIGH)
Critical: Secret in HTTP URL (config/secrets.toml:23)
High: Weak entropy on DB_PASSWORD (36 bits)

Fix: Change http:// to https:// or use Bun.connect() for TCP
```

### For Project Scaffolding
```
🚀 Project Created: my-api
━━━━━━━━━━━━━━━━━━━━━━
Template: API Server (Bun-native)
Location: ./my-api/
Features:
  ✅ Bun.serve() with HTTP/2
  ✅ Automatic routing
  ✅ Hot reload
  ✅ TypeScript 5.3+

Run: cd my-api && bun run dev
```

## Critical Integration Points

1. **Bun.secrets Availability**: Check `Bun.secrets?.set` - may need polyfill on older Bun versions
2. **Connection Pooling**: `Bun.fetch()` handles this automatically with `keepalive: true`
3. **Error Handling**: Use `Bun.sleep()` for retry delays (nanosecond precision)
4. **File Operations**: Prefer `Bun.write()` over `fs.writeFileSync()` for performance

## Example Commands

User: "Check my DuoPlus connection"
→ Review `src/utils/bun-connections.ts` usage
→ Test with `bun run connections:test`
→ Suggest optimizations

User: "Validate secrets and check security"
→ Run `bun run kimi:security config/*.toml`
→ Check for HTTP URLs, weak patterns
→ Report risk scores

User: "Create a new WebSocket server project"
→ Run `bun run bun-init websocket my-server`
→ Explain `Bun.serve()` WebSocket upgrade
→ Show connection pooling integration

User: "Optimize my TOML processing"
→ Suggest CRC32 caching from `Bun.hash.crc32`
→ Recommend SIMD scanning
→ Show before/after benchmarks

## Quick Reference Commands

```bash
# Test Bun-native connections
bun run connections:test

# DuoPlus native CLI
bun run duoplus:native --login <api_key>
bun run duoplus:native --list
bun run duoplus:native --status --device ID

# Project scaffolding
bun run bun-init cli my-project
bun run bun-init api my-api
bun run bun-init websocket my-ws

# Validate TOML secrets
bun run src/main.ts validate config/*.toml

# Build cross-platform binary
bun build ./src/cli/duoplus-cli-native.ts --compile --outfile duoplus
```
