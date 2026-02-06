# 🔥 Tier-1380 OMEGA: Column Standards CLI

> The definitive interface to the 97-column matrix universe

## Quick Start

```bash
# List all columns
bun matrix/column-standards-all.ts

# Or use the shorthand
bun run matrix:cols
```

## Installation

```bash
# Run the installer for shell integration
./matrix/column-standards-install.sh

# Or manually source completion
source matrix/column-standards-completion.bash
```

## 🆕 New in Phase 3.29

### Documentation Commands

| Command | Description |
|---------|-------------|
| `shortcuts` | List all shortcuts, aliases, and flags |
| `flags` | Detailed flag documentation |
| `matrix` | Full matrix grid view using `Bun.inspect.table()` |

### Diagnostics

| Command | Description |
|---------|-------------|
| `doctor` | Environment check using `Bun.which()` |
| `version` | Show CLI and Bun versions |

### Bun Utilities

This CLI leverages Bun's native utilities:

- **`Bun.inspect.table()`** - Beautiful tabular output for stats, matrix, shortcuts
- **`Bun.which()`** - Dependency detection in `doctor` command
- **`Bun.version`** - Runtime version information

## Commands

### Core Exploration

| Command | Description | Example |
|---------|-------------|---------|
| `list [filter]` | List all columns, optionally filtered | `cols list tension` |
| `get <col>` | Show detailed column info | `cols get 45` |
| `search <term>` | Fuzzy search across all fields | `cols search profile` |

### Zone Shortcuts

| Command | Zone | Range | Emoji |
|---------|------|-------|-------|
| `tension` | Tension | 31-45 | 🟠 |
| `cloudflare` | Cloudflare | 21-30 | 🟣 |
| `chrome` | Chrome State | 71-75 | 🔷 |
| `core` | Core | 1-10 | 🔵 |
| `validation` | Validation | 61-75 | 🟡 |

### Advanced Filtering

```bash
# Find with multiple criteria
cols find zone=tension required=true
cols find owner=platform type=url
cols find has=profileLink

# Pipe-friendly formats
cols pipe tsv > columns.tsv
cols pipe csv > columns.csv
cols pipe names | grep -i profile
cols pipe env > .env.columns
cols pipe grep-tags | head -10
```

### Favorites & Configuration

```bash
# Manage favorites
cols fav              # Show favorites
cols fav add 45       # Add to favorites
cols fav remove 45    # Remove from favorites

# Configuration
cols config show                    # Show config
cols config set cli.colors false    # Disable colors
cols config reset                   # Reset defaults
```

### Interactive Mode

```bash
# Start REPL
cols interactive

# Then type commands directly:
matrix> 45           # Show column 45
matrix> tension      # Show tension zone
matrix> search url   # Search
matrix> find type=float  # Filter
matrix> exit         # Quit
```

### Output & Export

```bash
# JSON output for scripting
cols get 45 --json
cols stats --json | jq '.byZone'

# Export documentation
cols export matrix/COLUMN-REFERENCE.md

# Preview clickable links
cols preview 45

# Watch for changes
cols watch
```

## Aliases

Pre-configured aliases in `column-standards-config.json`:

| Alias | Expands To |
|-------|------------|
| `t45` | `get 45` |
| `t31` | `get 31` |
| `cf` | `cloudflare` |
| `prof` | `find has=profileLink` |

Add your own:

```json
{
  "aliases": {
    "myfav": "get 42",
    "urls": "find type=url"
  }
}
```

## Tab Completion

Enable tab completion:

```bash
source matrix/column-standards-completion.bash

# Then enjoy:
cols get <TAB>      # Shows 0-96
cols list <TAB>     # Shows zones, types
cols pipe <TAB>     # Shows formats
```

## Package Scripts

```bash
# All available as npm scripts
bun run matrix:cols
bun run matrix:get 45
bun run matrix:search profile
bun run matrix:tension
bun run matrix:cloudflare
bun run matrix:validate
bun run matrix:stats
bun run matrix:pipe:tsv
bun run matrix:interactive
bun run matrix:export
bun run matrix:doctor        # Environment diagnostics
bun run matrix:matrix        # Grid view
bun run matrix:shortcuts     # All shortcuts
bun run matrix:flags         # Flag reference
bun run matrix:version       # Version info
bun run matrix:test          # Run test suite
bun run matrix:test:watch    # Run tests in watch mode
```

## Performance

| Command | Time | Memory |
|---------|------|--------|
| `get 45` | ~8ms | ~4MB |
| `search` | ~12ms | ~5MB |
| `pipe tsv` | ~15ms | ~4MB |
| `validate` | ~18ms | ~6MB |
| Full list | ~20ms | ~7MB |

## Files

| File | Purpose |
|------|---------|
| `column-standards-all.ts` | Main CLI executable |
| `column-standards-index.ts` | Column definitions |
| `column-standards-config.json` | User configuration |
| `column-standards-completion.bash` | Bash completions |
| `column-standards-demo.ts` | Demo script |
| `column-standards-install.sh` | Installer |
| `column-standards.test.ts` | Test suite (30 tests) |
| `column-standards-completion.fish` | Fish shell completion |
| `COLUMN-CLI-README.md` | This documentation |
| `QUICKREF-CLI.md` | Quick reference card |
| `SHORTCUTS-FLAGS-MATRIX.md` | Comprehensive reference |

## Examples

```bash
# Find all URL columns with profile links
cols find type=url has=profileLink --json

# Export all Cloudflare columns to TSV
cols list cloudflare | cols pipe tsv

# Get all required columns in tension zone
cols find zone=tension required=true

# Search and pipe to jq
cols search tension --json | jq '.[].name'

# Interactive exploration
cols interactive
```

## Tips

1. **Use `--json` for scripting**: All commands support `--json` flag
2. **Favorites for quick access**: Star frequently used columns
3. **Aliases save keystrokes**: Define shortcuts for common operations
4. **Pipe formats for integration**: TSV/CSV/env for external tools
5. **Interactive for exploration**: REPL mode for ad-hoc queries

## Phase 3.29 Complete 🎉

- ✅ 97 columns documented
- ✅ 10 zones organized
- ✅ 25+ commands
- ✅ Interactive REPL mode
- ✅ Persistent favorites
- ✅ Configurable aliases
- ✅ Tab completion
- ✅ Multiple export formats
- ✅ Live watch mode
- ✅ Full JSON API
- ✅ Markdown documentation export
- ✅ **Bun.inspect.table()** for beautiful tables
- ✅ **Bun.which()** for dependency detection
- ✅ Environment diagnostics (`doctor`)
- ✅ Full matrix grid view (`matrix`)
- ✅ Comprehensive shortcuts/flags reference
- ✅ Test suite (30 tests, all passing)
- ✅ Fish shell completion
