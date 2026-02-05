# MLGS Terminal Environment Quick Start Guide

**Version**: 11.0.0.0.0.0.0  
**Full Documentation**: `docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md`

---

## 🚀 Quick Start

### One-Time Setup

```bash
# Install dependencies and configure tmux
bun run tmux:setup
```

### Daily Workflow

```bash
# Start MLGS terminal environment
bun run tmux:start

# Or start specific session
./scripts/tmux-mlgs.sh core        # Core development
./scripts/tmux-mlgs.sh analytics   # Analytics & dashboard
./scripts/tmux-mlgs.sh research    # Research tools
./scripts/tmux-mlgs.sh monitoring  # Logs & monitoring
```

---

## ⌨️ Essential Keyboard Shortcuts

### Tmux Prefix
- **Prefix**: `Ctrl-Space` (instead of default `Ctrl-b`)

### Navigation
- `h/j/k/l` - Move between panes (Vim style)
- `|` or `-` - Split window (vertical/horizontal)
- `c` - New window
- `0-9` - Switch to window number
- `d` - Detach (session keeps running)

### Session Switching
- `Ctrl-Space Ctrl-s` - Core Development session
- `Ctrl-Space Ctrl-a` - Analytics session
- `Ctrl-Space Ctrl-d` - Research session
- `Ctrl-Space Ctrl-m` - Monitoring session

---

## 📋 Module-Specific Sessions

### Core Development (`mlgs-core`)

**Purpose**: Main development workflow

**Windows**:
1. **Main Dev**: Editor (left), dev server (right), tests (bottom)
2. **Git & Build**: Git status and build commands
3. **Type Check**: TypeScript type checking

**Start**:
```bash
./scripts/tmux-mlgs.sh core
# or
Ctrl-Space Ctrl-s
```

---

### Analytics (`mlgs-analytics`)

**Purpose**: Dashboard, correlation engine, performance monitoring

**Windows**:
1. **Dashboard**: Live trading dashboard (`bun run dashboard`)
2. **Correlation**: Correlation engine health and CLI
3. **Metrics**: Performance monitoring and benchmarks

**Start**:
```bash
./scripts/tmux-mlgs.sh analytics
# or
Ctrl-Space Ctrl-a
```

**Access MCP Error Codes**: Dashboard → MCP Monitoring Dashboard → Error Codes Tab (`6.1.1.2.2.8.1.1.2.6`)

**Correlation Commands**:
```bash
bun run correlation health              # Check engine health
bun run correlation graph <eventId>     # Build correlation graph
bun run correlation anomalies <eventId> # Detect anomalies
```

---

### Research (`mlgs-research`)

**Purpose**: Research tools, console, data analysis

**Windows**:
1. **Console**: Interactive Bun console with MLGS context (`bun run console`)
2. **Research Scripts**: Research and analysis scripts
3. **Data Analysis**: Query tools and data exploration

**Start**:
```bash
./scripts/tmux-mlgs.sh research
# or
Ctrl-Space Ctrl-d
```

**Research Scripts**:
```bash
bun run covert-steam
bun run scripts/research-auto-covert-arb-trader.ts
bun run scripts/research-identify-deceptive-lines.ts
bun run scripts/research-generate-shadow-market-graph.ts
bun run scripts/research-scan-covert-steam-events.ts
```

**Console Usage**:
```typescript
// In bun console (bun run console)
await research.events()      // List events
await research.anomalies()    // List anomalies
await research.edges()        // List edges

// Access MLGS modules
const graph = await shadowGraph
const detector = await steamDetector
const scanner = await arbScanner
```

---

### Monitoring (`mlgs-monitoring`)

**Purpose**: Logs, chaos tests, system health

**Windows**:
1. **Logs**: Real-time log monitoring (all logs, errors, warnings)
2. **Chaos**: Chaos engineering tests
3. **Health**: System health checks and metrics

**Start**:
```bash
./scripts/tmux-mlgs.sh monitoring
# or
Ctrl-Space Ctrl-m
```

**Chaos Tests**:
```bash
bun run chaos                    # Run all chaos tests
bun run chaos:kill-layer4       # Kill layer 4 processes
bun run chaos:kill-layer3       # Kill layer 3 processes
bun run chaos:kill-layer2       # Kill layer 2 processes
```

---

## 🔍 Ripgrep Quick Reference

### Find Terminal Environment Code

```bash
# Find all terminal environment references
rg "11\.0\.0\.0\.0\.0\.0" .

# Find tmux configuration
rg "11\.1\." .

# Find console configuration
rg "11\.2\." .

# Find setup scripts
rg "11\.3\." .
```

### Find Specific Components

```bash
# Tmux config (11.1.1.1.0.0.0)
rg "11\.1\.1\.1\.0\.0\.0" .

# Bun console (11.2.1.0.0.0.0)
rg "11\.2\.1\.0\.0\.0\.0" .

# Setup script (11.3.1.0.0.0.0)
rg "11\.3\.1\.0\.0\.0\.0" .
```

---

## 🛠️ Common Tasks

### Attach to Existing Session

```bash
# List all sessions
tmux list-sessions

# Attach to specific session
tmux attach -t mlgs-core
tmux attach -t mlgs-analytics
tmux attach -t mlgs-research
tmux attach -t mlgs-monitoring
```

### Kill Session

```bash
tmux kill-session -t mlgs-core
```

### Save/Restore Session

```bash
# Save manually
Ctrl-Space + Ctrl-s

# Restore
Ctrl-Space + Ctrl-r
```

---

## 🐛 Troubleshooting

### Tmux Not Starting

```bash
# Check version (should be >= 3.0)
tmux -V

# Install if needed
# macOS: brew install tmux
# Ubuntu: sudo apt install tmux
```

### Colors Not Working

```bash
# Ensure terminal supports 256 colors
echo $TERM  # Should be xterm-256color

# Set in shell profile
export TERM=xterm-256color
```

### Bun Console Errors

```bash
# Check Bun version (should be >= 1.0)
bun --version

# Install dependencies
bun install

# Clear console cache
rm -f .bun-console-history
```

---

## 📚 Related Documentation

- **Full Documentation**: `docs/11.0.0.0.0.0.0-TERMINAL-ENVIRONMENT.md`
- **Dashboard Manifest**: `docs/17.0.0.0.0.0.0-DASHBOARD-MANIFEST.md` (includes MCP Error Codes: `6.1.1.2.2.8.1.1.2.6`)
- **MCP Error Codes**: `docs/6.1.1.2.2.8.1.1.2.6-Enhanced-MCP-Error-Code-Management-and-Discoverability/MCP-ERROR-CODES.md`
- **Versioning**: `commands/VERSIONING.md`

---

## ✅ Daily Checklist

Before starting development:

- [ ] Tmux session started (`bun run tmux:start`)
- [ ] All panes loaded correctly
- [ ] Bun console accessible (Research session, Window 1)
- [ ] Tests running (Core session, Window 1, bottom pane)
- [ ] Dashboard accessible (Analytics session, Window 1)
- [ ] Logs visible (Monitoring session, Window 1)

---

**Quick Access**: `bun run tmux:start` → Start your MLGS development environment!
