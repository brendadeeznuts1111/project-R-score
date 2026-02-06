# 🔥 Tier-1380 OMEGA: Column Standards CLI

> The definitive interface to the 97-column matrix universe. Built with Bun. Optimized for speed.

## Quick Start

```bash
# Run the CLI
bun matrix/column-standards-all.ts get 45

# Or use npm script
bun run matrix:cols get 45

# With shell integration (recommended)
source matrix/shell-integration-async.zsh  # Instant startup!
```

## Features

- ✅ **25+ CLI commands** - get, list, search, find, validate, stats, interactive, and more
- ✅ **97 columns documented** across 10 zones
- ✅ **30 passing tests** - comprehensive coverage
- ✅ **Multi-shell support** - Bash, Zsh, Fish
- ✅ **Editor plugins** - Neovim, Emacs, VS Code, Raycast
- ✅ **System integration** - Tmux, Git hooks, CI/CD
- ✅ **Up to 250x performance improvement** with caching

## Installation

```bash
# Clone or copy the matrix/ directory

# Install shell integration
echo 'source matrix/shell-integration-async.zsh' >> ~/.zshrc

# Or for Bash
echo 'source matrix/shell-integration-optimized.bash' >> ~/.bashrc

# Install completions (Fish)
cp matrix/column-standards-completion.fish ~/.config/fish/completions/
```

## Commands

### Core
```bash
bun matrix:cols get 45              # Get column details
bun matrix:cols list                # List all columns
bun matrix:cols search profile      # Fuzzy search
bun matrix:cols find zone=tension   # Multi-criteria filter
bun matrix:cols stats               # Statistics
bun matrix:cols validate            # Schema validation
bun matrix:cols interactive         # REPL mode
```

### Zone Shortcuts
```bash
bun matrix:cols tension             # Tension zone (31-45)
bun matrix:cols cloudflare          # Cloudflare zone (21-30)
bun matrix:cols chrome              # Chrome state (71-75)
bun matrix:cols core                # Core zone (1-10)
bun matrix:cols validation          # Validation zone (61-75)
```

### Export & Pipe
```bash
bun matrix:cols pipe tsv > cols.tsv # TSV export
bun matrix:cols pipe names          # Just names
bun matrix:cols export docs.md      # Markdown docs
```

## Performance

| Metric | Standard | Optimized | Speedup |
|--------|----------|-----------|---------|
| Shell startup | 100ms | **2ms** | **50x** |
| Command | 22ms | **0.6ms** | **37x** |
| Completion | 25ms | **0.1ms** | **250x** |
| FZF preview | 45ms | **2ms** | **22x** |

## Documentation

| File | Description |
|------|-------------|
| [COLUMN-CLI-README.md](COLUMN-CLI-README.md) | Main documentation |
| [QUICKREF-CLI.md](QUICKREF-CLI.md) | Quick reference card |
| [SHELL-INTEGRATION.md](SHELL-INTEGRATION.md) | Shell integration guide |
| [INTEGRATIONS.md](INTEGRATIONS.md) | Editor & system integrations |
| [PERFORMANCE-OPTIMIZATIONS.md](PERFORMANCE-OPTIMIZATIONS.md) | Performance guide |
| [COMPLETE-INDEX.md](COMPLETE-INDEX.md) | Full file index |

## Key Bindings (Zsh)

| Key | Action |
|-----|--------|
| `Alt+C` | Column picker |
| `Alt+Z` | Zone picker |
| `Alt+I` | Insert column name |
| `Ctrl+G` | FZF picker (Bash) |

## Testing

```bash
bun run matrix:test           # Run tests
bun run matrix:test:watch     # Watch mode
bun run matrix:benchmark      # Performance profile
```

## Project Stats

- **40 files** (~700KB)
- **3,600 lines** of documentation
- **30 tests** (all passing)
- **10 zones** (97 columns)
- **250x max speedup**

## Links

- [Bun](https://bun.sh)
- [Full Documentation](COLUMN-CLI-README.md)
- [Performance Guide](PERFORMANCE-OPTIMIZATIONS.md)

## License

MIT - Tier-1380 OMEGA Protocol
