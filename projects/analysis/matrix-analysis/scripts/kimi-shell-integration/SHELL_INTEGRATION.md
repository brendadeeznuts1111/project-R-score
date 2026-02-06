# Kimi Shell Integration

## Unified Shell Bridge

The unified shell bridge integrates **Kimi Shell**, **OpenClaw**, and **Profile Terminal** into a single MCP interface.

### Location
- **Bridge**: `~/.kimi/tools/unified-shell-bridge.ts`
- **Config**: `~/.kimi/mcp.json`

### Available Tools

| Tool | Description | Example |
|------|-------------|---------|
| `shell_execute` | Execute with profile/OpenClaw context | `shell_execute({command: "openclaw status", openclaw: true})` |
| `openclaw_status` | Check gateway status | `openclaw_status()` |
| `openclaw_gateway_restart` | Restart gateway | `openclaw_gateway_restart()` |
| `profile_list` | List profiles | `profile_list()` |
| `profile_bind` | Bind directory to profile | `profile_bind({profile: "dev"})` |
| `profile_switch` | Switch profile | `profile_switch({profile: "prod"})` |
| `profile_status` | Show binding status | `profile_status()` |
| `matrix_agent_status` | Check Matrix Agent | `matrix_agent_status()` |
| `cron_list` | List cron jobs | `cron_list()` |

### Environment Variables

```bash
export MATRIX_PROFILES_DIR="$HOME/.matrix/profiles"
export OPENCLAW_GATEWAY_TOKEN=$(bun -e 'const t=await Bun.secrets.get({service:"com.openclaw.gateway",name:"gateway_token"});console.log(t)')
```

### Quick Commands

```bash
# Start Kimi MCP server
kimi mcp serve

# Or use unified bridge directly
bun run ~/.kimi/tools/unified-shell-bridge.ts
```

### Integration Flow

```text
Kimi Shell → unified-shell-bridge → {OpenClaw, Profile Terminal, Matrix Agent}
                ↓
         Bun.secrets (token storage)
                ↓
         Environment injection
                ↓
         Command execution
```

