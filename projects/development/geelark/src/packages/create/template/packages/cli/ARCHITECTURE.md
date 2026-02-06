# 🏗️ Dev HQ CLI Architecture

## 🎯 **Perfect Separation Pattern**

Dev HQ CLI follows **THE** fundamental architectural pattern for Bun-based CLIs:

```bash
# Perfect separation: Bun handles Bun flags, CLI handles CLI flags
bun [bun-flags] script.ts [command] [cli-flags]
```

## 📋 **Pattern Breakdown**

```bash
bun --hot --watch dev-hq-cli.ts insights --table --json
└─┬─┘ └────┬─────┘ └──────┬──────┘ └──┬──┘ └────┬────┘
  │        │              │           │         └── CLI flags (what)
  │        │              │           └── Command
  │        │              └── Script
  │        └── Bun runtime flags (how)
  └── Bun executable
```

## 🔍 **Flow Demonstration**

```text
User Command
    ↓
Bun Executable
    ├─→ Bun Flag Parser → Bun Runtime Config
    └─→ Load Script → CLI Flag Parser → Execute Command → Format Output
```

### **Bun's Responsibility**
- Runtime flags parsing (--hot, --watch, --smol, --inspect)
- Script loading and execution
- Module resolution
- Hot reloading
- Debugging support

### **CLI's Responsibility**
- Command parsing (insights, serve, health)
- CLI flags parsing (--table, --json, --port, --metrics)
- Output formatting
- Error handling and display
- Business logic execution

## 🏗️ **Architectural Rule**

**RULE**: If it affects **how Bun runs** the script → **Bun flag**. If it affects **what the script does** → **CLI flag**.

## ✅ **Correct Usage Examples**

```bash
# Development with hot reload (Bun handles --hot, CLI handles --table)
bun --hot --watch packages/cli/src/index.ts insights --table

# Production profiling (Bun handles --smol, CLI handles --json)
bun --smol packages/cli/src/index.ts insights --json

# Debug session (Bun handles --inspect, CLI handles commands)
bun --inspect=9229 packages/cli/src/index.ts serve --port=3000

# Environment-specific (Bun handles --define, CLI handles --env)
bun --define.NODE_ENV=production packages/cli/src/index.ts deploy --env=staging
```

## ❌ **Incorrect Usage**

```bash
# Mixed concerns - don't do this
bun packages/cli/src/index.ts --hot --table  # ❌ --hot is Bun flag, --table is CLI flag

# Flags in wrong position
bun packages/cli/src/index.ts insights --watch  # ❌ --watch ignored, passed to script
```

## 🎨 **Flag Classification**

### **Bun Runtime Flags** (Before Script)
Control **how** Bun executes the script:

- `--hot` - Hot module reload
- `--watch` - File watching
- `--smol` - Low memory mode
- `--inspect` - Debugger support
- `--define` - Build-time defines
- `--preload` - Module preloading
- `--filter` - Workspace filtering
- `--conditions` - Module resolution

### **CLI Flags** (After Command)
Control **what** the script does:

- `--table` - Table output format
- `--json` - JSON output format
- `--port` - Server port number
- `--metrics` - Enable metrics
- `--verbose` - Verbose logging
- `--quiet` - Quiet mode

## 🚀 **Real-World Command Examples**

```bash
# Development workflow
bun --hot --watch packages/cli/src/index.ts serve --port=3000

# Production build analysis
bun --smol packages/cli/src/index.ts insights --json | jq '.stats'

# Debug with metrics
bun --inspect packages/cli/src/index.ts run --metrics bun test

# Environment-specific deployment
bun --define.NODE_ENV=production packages/cli/src/index.ts deploy --env=staging
```

## 🏆 **Pattern Benefits**

1. **Clear Responsibility**: No ambiguity about which tool handles what
2. **Predictable Behavior**: Users learn once, apply everywhere
3. **Tool Evolution**: Bun can add runtime flags without breaking CLIs
4. **CLI Flexibility**: CLIs can add features without Bun changes
5. **Composition**: Easy to compose commands with consistent patterns

## 📈 **Adoption Checklist**

✅ **Bun flags**: Before script name, control runtime behavior
✅ **CLI flags**: After command, control script behavior  
✅ **Command**: Required action, after script name
✅ **Output formatting**: CLI responsibility, not Bun
✅ **Error handling**: CLI formats errors, Bun reports them

## 🔗 **Reference Implementation**

```typescript
// Dev HQ CLI correctly implements the pattern
// Bun handles runtime flags automatically
// CLI parses only CLI-specific flags after the command

// Example: bun --hot packages/cli/src/index.ts insights --table
//          └─ Bun ─┘                        └── CLI ──┘
```

## 🎯 **Quick Reference**

```bash
# THE PATTERN: Bun flags before script, CLI flags after
bun [bun-flags] script.ts [command] [cli-flags]

# ✅ CORRECT USAGE
bun --hot --watch app.ts serve --port=3000 --cors

# ❌ INCORRECT USAGE (mixes concerns)
bun app.ts --hot --port=3000  # Mixed: --hot is Bun flag, --port is CLI flag
```

---

**This is THE winning pattern for all Bun-based command-line tools!** 🎉


