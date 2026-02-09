# Unified Shell Architecture

## Overview
Bun-native shell integration using MCP (Model Context Protocol) standard.

```
┌─────────────────────────────────────────────────────────────────┐
│                     KIMI SHELL LAYERS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 3: IDE Integration (ACP - Optional)                       │
│  ├── Zed          → 'kimi acp' (separate process)               │
│  └── JetBrains    → 'kimi acp'                                 │
│                                                                  │
│  Layer 2: MCP Bridge (THIS PROJECT)                              │
│  ├── unified-shell-bridge.ts  → Main MCP server                  │
│  ├── shell execution via Bun.$                                   │
│  ├── Matrix profile loading                                      │
│  └── OpenClaw gateway integration                                │
│                                                                  │
│  Layer 1: Bun Native                                             │
│  ├── Bun.spawn()      → Process execution                        │
│  ├── Bun.$            → Shell tagged template                    │
│  ├── signal handling  → SIGTERM/SIGINT/SIGHUP                    │
│  └── fetch()          → HTTP/WebSocket                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. unified-shell-bridge.ts (PRIMARY)
**Location:** `~/.kimi/tools/unified-shell-bridge.ts`
**Protocol:** MCP (Model Context Protocol)
**Purpose:** Shell execution with Matrix/OpenClaw integration
**Signals:** SIGTERM, SIGINT, SIGHUP, SIGUSR1, SIGUSR2

### 2. MCP Config
**Location:** `~/.kimi/mcp.json`
```json
{
  "mcpServers": {
    "unified-shell": {
      "command": "bun",
      "args": ["run", "~/.kimi/tools/unified-shell-bridge.ts"]
    }
  }
}
```

### 3. Deprecated (Do Not Use)
- `~/.kimi/tools/shell-bridge.js` → Old JS version
- `~/.kimi/tools/shell-bridge.ts` → Old TS version  
- `~/.kimi/tools/tier1380-shell-bridge.ts` → Legacy

## Usage

### From Claude/Kimi
```typescript
// MCP tool call
const result = await executeCommand("git status", {
  profile: "production",
  openclaw: true
});
```

### Signal Handling
```typescript
// All signals handled gracefully
process.on('SIGTERM', () => gracefulShutdown());
process.on('SIGINT', () => gracefulShutdown());
process.on('SIGHUP', () => gracefulShutdown());
```

## Bun Native Features Used

| Feature | Usage |
|---------|-------|
| `Bun.$` | Shell command execution |
| `Bun.spawn()` | Process management |
| `Bun.secrets.get()` | Token retrieval |
| `Bun.file().json()` | Profile loading |
| Signal handling | Native OS signal support |
| `performance.now()` | High-res timing |

## Cleanup

Remove deprecated bridges:
```bash
rm ~/.kimi/tools/shell-bridge.js
rm ~/.kimi/tools/shell-bridge.ts
rm ~/.kimi/tools/tier1380-shell-bridge.ts
rm ~/.kimi/tools/shell-bridge  # symlink
```
