# Kimi Shell Standards (Refactored)

Following [kimi-cli skill discovery](https://moonshotai.github.io/kimi-cli/en/customization/skills.html) standards.

## Directory Structure

```
~/.config/
├── agents/skills/              # User-level skills (recommended)
│   └── unified-shell/          # Our shell skill
│       └── SKILL.md
└── kimi/
    ├── tools/                  # Executable tools
    │   └── unified-shell-bridge.ts
    └── mcp.json               # MCP configuration

.agents/skills/                 # Project-level skills (recommended)
└── bun-v139-playground/
    └── SKILL.md
```

## Key Distinction

| Type | Location | Purpose |
|------|----------|---------|
| **Skills** | `~/.config/agents/skills/` | AI capabilities (SKILL.md) |
| **Tools** | `~/.config/kimi/tools/` | Executables (bridge.ts) |
| **Config** | `~/.config/kimi/mcp.json` | MCP server config |

## Migration from Old Structure

| Old | New |
|-----|-----|
| `~/.kimi/tools/unified-shell-bridge.ts` | `~/.config/kimi/tools/unified-shell-bridge.ts` |
| `~/.kimi/mcp.json` | `~/.config/kimi/mcp.json` |
| `~/.kimi/skills/` | `~/.config/agents/skills/` |

## Bun Native Throughout

All tools use Bun native APIs:
- `Bun.$` - Shell execution
- `Bun.spawn()` - Process management
- `process.on()` - Signal handling
- `Bun.secrets.get()` - Token retrieval
- `Bun.file().json()` - Profile loading
