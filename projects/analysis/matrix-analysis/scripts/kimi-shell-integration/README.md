# Kimi Shell Integration v2.0 🚀

[![Tests](https://img.shields.io/badge/tests-28%20passing-success)](unified-shell-bridge.test.ts)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.3.9-black)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Unified MCP Bridge** integrating Kimi Shell, OpenClaw, and Profile Terminal with Bun-native signal handling, health monitoring, and evidence-based governance.

## 📦 Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `unified-shell-bridge.ts` | MCP server with signal handling | ✅ Complete |
| `zsh-bridge-connector.ts` | Zsh plugin integration | ✅ Complete |
| `dashboard/health-dashboard.ts` | Real-time monitoring | ✅ Complete |
| `evidence/` | T1-T4 validation framework | ✅ Complete |
| `bench/` | Performance benchmarks | ✅ Complete |

## 🚀 Quick Start

### 1. Install Official Zsh Plugin
```bash
# Oh My Zsh
git clone https://github.com/MoonshotAI/zsh-kimi-cli.git \
  ${ZSH_CUSTOM:-~/.oh-my-zsh/custom}/plugins/kimi-cli
# Add to ~/.zshrc: plugins=(... kimi-cli)

# Or Zinit
zinit light MoonshotAI/zsh-kimi-cli
```

### 2. Install Unified Bridge
```bash
mkdir -p ~/.kimi/tools
cp unified-shell-bridge.ts ~/.kimi/tools/
cp mcp.json ~/.kimi/
```

### 3. Start Services
```bash
# Terminal 1: MCP Server
bun run ~/.kimi/tools/unified-shell-bridge.ts

# Terminal 2: Health Dashboard
bun run dashboard/health-dashboard.ts

# Terminal 3: Zsh Connector (optional)
bun run zsh-bridge-connector.ts
```

### 4. Access Dashboard
Open http://localhost:18790/dashboard

## ✨ Features

### Bun-Native Signal Handling
- ✅ SIGINT/SIGTERM/SIGHUP handlers
- ✅ Graceful shutdown with cleanup
- ✅ Configurable timeout (5s default)
- ✅ Exit codes: 0 (normal), 130 (SIGINT), 143 (SIGTERM)

### Zsh Integration
- ✅ Auto-detects official zsh-kimi-cli plugin
- ✅ Syncs command history
- ✅ Profile context sharing
- ✅ Working directory tracking

### Health Monitoring
- ✅ Real-time dashboard at `:18790`
- ✅ Command/error rate tracking
- ✅ Memory usage monitoring
- ✅ Signal history

### Evidence Framework
- ✅ T1-T4 validation (Source → Benchmark)
- ✅ Automated council escalation
- ✅ Reproducible benchmarks
- ✅ CI/CD integration

## 🧪 Testing

```bash
# Run all tests
bun test unified-shell-bridge.test.ts

# Run benchmarks
bash council-benchmarks.sh

# Run signal demo
bun run signal-demo.ts
```

## 📊 Benchmarks

| Metric | Result | Status |
|--------|--------|--------|
| Unix Socket (512B) | 0.032ms | ✅ <5ms |
| Storage (100MB) | 1.51x speedup | ✅ Pass |
| Signal Handler | 1.18M ops/s | ✅ Pass |

## 🔌 MCP Tools

| Tool | Description |
|------|-------------|
| `shell_execute` | Execute with profile/OpenClaw context |
| `zsh_context` | Get Zsh state (profile, directory, history) |
| `bridge_health` | Health and telemetry |
| `profile_list` | List available profiles |
| `openclaw_status` | Check OpenClaw gateway |

## 📚 Documentation

- [SHELL_INTEGRATION.md](SHELL_INTEGRATION.md) - Full usage guide
- [QUICK_START.md](QUICK_START.md) - Setup instructions
- [DECISIONS.md](evidence/DECISIONS.md) - Evidence-based decisions
- [UPDATE_SUMMARY.md](UPDATE_SUMMARY.md) - Change log

## 🏛️ Evidence-Based Governance

All technical claims must have T1-T4 evidence:

| Tier | Source | Example |
|------|--------|---------|
| T1 | Official docs | Bun v1.3.9 release notes |
| T2 | Production telemetry | OpenCode metrics |
| T3 | Benchmarks | Reproducible tests |
| T4 | Architecture | DDD patterns |

## 🤝 Integration with Official Plugin

This bridge **complements** (not replaces) the official [MoonshotAI/zsh-kimi-cli](https://github.com/MoonshotAI/zsh-kimi-cli):

| | zsh-kimi-cli (Official) | unified-shell-bridge (This) |
|---|---|---|
| **Purpose** | Terminal interaction | Automation/MCP |
| **Trigger** | Ctrl-X in Zsh | MCP tools/API |
| **Use Case** | Daily CLI work | Scripts, CI/CD |
| **Install** | Required | Optional add-on |

## 📝 License

MIT

---

**Maintained by**: @nolarose  
**Bun Version**: >= 1.3.9  
**Platform**: macOS, Linux
