# NEXUS CLI Commands Reference

**11.0.0.0.0.0.0: CLI Commands Subsystem**

Complete documentation for all command-line tools in the NEXUS Trading Intelligence Platform.

**Cross-Reference:**
- `7.0.0.0.0.0.0` → Bun Runtime Utilities (used by all CLI commands)
- `7.4.x.x.x.x.x` → Process & Execution (Bun.spawn, Bun.shell)
- `7.5.x.x.x.x.x` → File & Stream (Bun.file, Bun.write)
- `9.1.1.x.x.x.x` → Telegram Integration
- `10.0.0.0.0.0.0` → Authentication & Session Management

---

## Available Commands

### 11.1.0.0.0.0.0: Telegram Management

**[telegram](./telegram.md)** - Telegram supergroup management and alerts

**Version:** `11.1.0.0.0.0.0`  
**Cross-Reference:** `9.1.1.x.x.x.x` → Telegram Integration

### 11.2.0.0.0.0.0: MCP Tools Execution

**[mcp](./mcp.md)** - MCP (Model Context Protocol) tools execution

**Version:** `11.2.0.0.0.0.0`  
**Cross-Reference:** `7.0.0.0.0.0.0` → Bun Runtime Utilities

### 11.3.0.0.0.0.0: Live Dashboard

**[dashboard](./dashboard.md)** - Live trading dashboard

**Version:** `11.3.0.0.0.0.0`  
**Cross-Reference:** `6.0.0.0.0.0.0` → Market Intelligence Visualization

### 11.4.0.0.0.0.0: Data Import

**[fetch](./fetch.md)** - Trade data import and exchange integration

**Version:** `11.4.0.0.0.0.0`  
**Cross-Reference:** `7.5.x.x.x.x.x` → File & Stream Operations

### 11.5.0.0.0.0.0: Security Testing

**[security](./security.md)** - Security testing and SRI generation

**Version:** `11.5.0.0.0.0.0`  
**Cross-Reference:** `7.2.x.x.x.x.x` → Cryptographic Operations

### 11.6.0.0.0.0.0: System Management

**[management](./management.md)** - System service management

**Version:** `11.6.0.0.0.0.0`  
**Cross-Reference:** `7.4.x.x.x.x.x` → Process & Execution

### 11.7.0.0.0.0.0: GitHub Integration

**[github](./github.md)** - GitHub integration utilities

**Version:** `11.7.0.0.0.0.0`

### 11.8.0.0.0.0.0: Password Utilities

**[password](./password.md)** - Password generation utilities

**Version:** `11.8.0.0.0.0.0`  
**Cross-Reference:** `7.2.x.x.x.x.x` → Cryptographic Operations

---

## Quick Start

```bash
# View all available commands
ls commands/

# Get help for a specific command
bun run <command> --help

# Example: Telegram help
bun run telegram --help
```

## Command Structure

All CLI commands follow this pattern:

```bash
bun run <command> [subcommand] [options] [arguments]
```

**Implementation Pattern:** `11.0.1.0.0.0.0` - CLI Argument Parsing
- Uses `Bun.argv.slice(2)` for argument extraction
- Supports `--key=value` and `--key value` formats
- Boolean flags via `--flag`

## Environment Variables

Many commands use environment variables for configuration:

- `TELEGRAM_BOT_TOKEN` - Telegram bot token (`11.1.1.0.0.0.0`)
- `TELEGRAM_CHAT_ID` - Telegram chat/supergroup ID (`11.1.1.0.0.0.0`)
- `API_URL` - API base URL (default: http://localhost:3000) (`11.3.1.0.0.0.0`)
- `DEV` / `NODE_ENV` - Development mode flag (`11.0.2.0.0.0.0`)

## Bun-Native Features

All commands use Bun's native APIs:

- `Bun.argv` - Command-line argument parsing (`11.0.1.0.0.0.0`)
- `Bun.shell` (`$` template tag) - Shell command execution (`11.0.3.0.0.0.0`)
- `Bun.file()` - File I/O operations (`11.0.4.0.0.0.0`)
- `Bun.spawn()` - Process spawning (`11.0.5.0.0.0.0`)

**Cross-Reference:**
- `7.4.3.x.x.x.x` → Bun.spawn() advanced configuration
- `7.5.2.0.0.0.0` → Bun.file() file reference
- `7.5.4.0.0.0.0` → Bun.write() atomic file writing

## BunUtilities Integration

All commands can use `BunUtilities` for enhanced formatting:

```typescript
import { BunUtilities } from '../src/utils/bun-utilities';

// Progress bars
console.log(BunUtilities.createProgressBar(75, 100, 30));

// Tables
console.log(BunUtilities.formatTable(data));

// String measurement
const width = BunUtilities.stringWidth('Hello 🌍');

// Color gradients
const gradient = BunUtilities.createGradient('Hello', startColor, endColor);
```

**See:** [`docs/BUN-UTILITIES-COMPLETE.md`](../docs/BUN-UTILITIES-COMPLETE.md) for complete BunUtilities API reference.

## See Also

- [CLI Documentation](../docs/)
- [MCP Tools](../src/mcp/tools/)
- [API Routes](../src/api/routes.ts)
- [Bun Runtime Utilities](../src/runtime/bun-native-utils-complete.ts)
