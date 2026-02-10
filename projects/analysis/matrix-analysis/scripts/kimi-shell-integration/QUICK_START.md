# Kimi Shell Quick Start

## Complete Setup (Zsh + MCP Bridge)

### 1. Install Official Zsh Plugin

```bash
# Oh My Zsh users
git clone https://github.com/MoonshotAI/zsh-kimi-cli.git \
  ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/kimi-cli

# Add to ~/.zshrc:
plugins=(git kimi-cli ...)
```

**Other plugin managers:**
```bash
# Zinit
zinit light MoonshotAI/zsh-kimi-cli

# Antigen
antigen bundle MoonshotAI/zsh-kimi-cli

# Zplug
zplug "MoonshotAI/zsh-kimi-cli", as:plugin
```

### 2. Install Unified Shell Bridge

```bash
# Copy files to Kimi directory
mkdir -p ~/.kimi/tools
cp unified-shell-bridge.ts ~/.kimi/tools/
cp mcp.json ~/.kimi/

# Make executable
chmod +x ~/.kimi/tools/unified-shell-bridge.ts
```

### 3. Usage

#### Zsh Interaction (Ctrl-X)
```bash
# In Zsh terminal
Ctrl-X              # Start Kimi CLI mode
> openclaw status   # Type commands
Ctrl-X              # Exit mode
```

#### MCP Server (Automation)
```bash
# Start unified bridge
bun run ~/.kimi/tools/unified-shell-bridge.ts

# Or via Kimi CLI
kimi mcp serve
```

#### Available MCP Tools
```javascript
// Via unified bridge
shell_execute({ command: "openclaw status", openclaw: true })
profile_list()                          // List profiles
profile_switch({ profile: "prod" })     // Switch profile
bridge_health()                         // Check health
```

### 4. Integration Flow

```
┌─────────────────────────────────────────────────────────┐
│                     User Workflow                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Zsh Terminal          Unified Bridge          Services  │
│  ───────────          ───────────────         ─────────  │
│       │                      │                    │      │
│  Ctrl-X │                      │                    │      │
│   ────► │                      │                    │      │
│       │ │                      │                    │      │
│       │ ├─► shell_execute()   │                    │      │
│       │ │                      ├─► OpenClaw         │      │
│       │ │                      │                    │      │
│       │ │                      ├─► Profile Terminal │      │
│       │ │                      │                    │      │
│       │ │◄─ JSON response      │                    │      │
│       │◄─                      │                    │      │
│   ────► │                      │                    │      │
│  Ctrl-X │                      │                    │      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5. Testing

```bash
# Run all tests
cd projects/analysis/matrix-analysis/scripts/kimi-shell-integration
bun test unified-shell-bridge.test.ts

# Run benchmarks
bash council-benchmarks.sh

# Run signal demo
bun run signal-demo.ts
```

### 6. Key Files

| File | Purpose |
|------|---------|
| `unified-shell-bridge.ts` | MCP server with Bun signal handling |
| `mcp.json` | MCP server configuration |
| `SHELL_INTEGRATION.md` | Full documentation |
| `DECISIONS.md` | Evidence-based decision log |

### 7. Official Resources

- **Zsh Plugin**: https://github.com/MoonshotAI/zsh-kimi-cli
- **Bun Docs**: https://bun.com/docs/api/process#signals
- **MCP Protocol**: https://modelcontextprotocol.io

---

**Tip**: Use `Ctrl-X` for quick interactions, unified bridge for automation/scripts.
