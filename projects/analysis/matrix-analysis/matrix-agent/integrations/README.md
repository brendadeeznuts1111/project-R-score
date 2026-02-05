# Matrix Agent ↔ OpenClaw Integration

Bidirectional integration between Matrix Agent (Tier-1380 governance) and OpenClaw (WhatsApp/ACP gateway).

## Architecture

```
┌─────────────────┐     ACP Protocol      ┌─────────────────┐
│  Matrix Agent   │ ◄──────────────────► │    OpenClaw     │
│  ~/.matrix/     │   Commands/Events    │  ~/openclaw/    │
└────────┬────────┘                      └────────┬────────┘
         │                                        │
         │    ┌──────────────────────────┐       │
         └───►│   openclaw-bridge.ts     │◄──────┘
              │  Bidirectional Bridge    │
              └──────────────────────────┘
```

## Features

- **Command Proxy**: Execute Matrix commands from OpenClaw and vice versa
- **Session Sync**: Synchronize sessions between both systems
- **Event Forwarding**: Real-time event streaming between agents
- **Tier-1380 Access**: OpenClaw can leverage commit governance
- **CRC32 Acceleration**: Hardware-accelerated hashing utilities

## Quick Start

```bash
# Initialize the bridge
bun matrix-agent/integrations/openclaw-bridge.ts init

# Check integration status
bun matrix-agent/integrations/openclaw-bridge.ts status

# Sync sessions between systems
bun matrix-agent/integrations/openclaw-bridge.ts sync
```

## Commands

### From Matrix to OpenClaw

```bash
# Proxy Matrix profile command to OpenClaw
bun openclaw-bridge.ts proxy profile list

# Proxy Tier-1380 command
bun openclaw-bridge.ts proxy tier1380 color init --team=omega
```

### From OpenClaw to Matrix

```bash
# Proxy OpenClaw command to Matrix
bun openclaw-bridge.ts matrix status

# Access commit flow
bun openclaw-bridge.ts matrix commit --generate
```

## OpenClaw Plugin

The Matrix Agent plugin for OpenClaw provides:

```bash
# Inside OpenClaw CLI
openclaw matrix.commit --generate              # Generate commit message
openclaw matrix.commit --message="[PLATFORM]..." # Create commit
openclaw matrix.profile list                   # List profiles
openclaw matrix.crc32 --input="text"           # Compute CRC32
```

## Configuration

Config file: `~/.matrix/openclaw-bridge.json`

```json
{
  "openclaw": {
    "enabled": true,
    "acpEndpoint": "http://localhost:18790/acp",
    "gatewayPort": 18790
  },
  "matrix": {
    "enabled": true,
    "agentSocket": "~/.matrix/agent.sock"
  },
  "sync": {
    "sessions": true,
    "commands": true,
    "events": true
  }
}
```

## API Reference

### OpenClawBridge Class

```typescript
import { OpenClawBridge } from "./openclaw-bridge";

const bridge = new OpenClawBridge();
await bridge.init();

// Send command to OpenClaw
await bridge.sendToOpenClaw({
  name: "session.list",
  args: [],
});

// Send event to Matrix
await bridge.sendToMatrix("status.update", { status: "active" });

// Proxy commands
await bridge.proxyMatrixCommand("profile", ["list"]);
await bridge.proxyOpenClawCommand("status", []);
```

## Integration Points

| Feature | Matrix Agent | OpenClaw | Bridge |
|---------|-------------|----------|--------|
| Profiles | ✅ | ✅ | ✅ Sync |
| Sessions | ✅ | ✅ | ✅ Sync |
| Tier-1380 | ✅ | Via Plugin | ✅ Proxy |
| CRC32 | ✅ | Via Plugin | ✅ Utils |
| Events | ✅ | ✅ | ✅ Forward |
| Health | ✅ | ✅ | ✅ Check |

## Troubleshooting

### Bridge not connecting
```bash
# Check both systems are initialized
bun ~/.matrix/matrix-agent.ts status
ls ~/openclaw/openclaw.mjs
```

### Permission issues
```bash
# Ensure proper permissions
chmod +x matrix-agent/integrations/openclaw-bridge.ts
```

### Sync failures
```bash
# Force re-sync
bun openclaw-bridge.ts sync --force
```

## License

MIT - Part of nolarose-mcp-config
