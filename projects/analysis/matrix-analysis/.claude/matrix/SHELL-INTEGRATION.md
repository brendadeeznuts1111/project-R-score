# 🔥 Tier-1380 OMEGA: Shell Integration Guide

> Enhanced shell integration for matrix:cols CLI with FZF, key bindings, and smart widgets

## Quick Start

```bash
# Bash
echo 'source /path/to/matrix/shell-integration.bash' >> ~/.bashrc

# Zsh
echo 'source /path/to/matrix/shell-integration.zsh' >> ~/.zshrc

# Fish
cp /path/to/matrix/column-standards-completion.fish ~/.config/fish/completions/
```

## Features

### 1. Smart `cols()` Function

Replaces simple aliases with a powerful function:

```bash
cols get 45              # Get column 45
cols g 45                # Short alias
cols 45                  # Direct column number
cols t                   # Zone shortcut
cols i                   # Interactive mode
cols f zone=tension      # Find with criteria
```

### 2. FZF Integration

Requires [fzf](https://github.com/junegunn/fzf) (`brew install fzf`)

```bash
# Interactive column picker with preview
cols-fzf

# Multi-select columns
cols-fzf-multi

# Zone-filtered picker
cols-fzf-zone tension
```

### 3. Key Bindings

| Key | Action | Shell |
|-----|--------|-------|
| `Alt+C` | Column picker | Zsh |
| `Alt+Z` | Zone picker | Zsh |
| `Alt+I` | Insert column name | Zsh |
| `Ctrl+G` | Column picker | Bash |

### 4. Zsh Prompt Integration

Shows current column context in RPROMPT:

```bash
$ cols get 45
🔥 Column 45 displayed

$                      🔥 45:tension-profile-link
```

Clear with: `cols clear` or `cols unset`

### 5. Utility Functions

```bash
# Copy column name to clipboard
cols-copy 45

# Watch column for changes (auto-refresh)
cols-watch-column 45

# Compare two columns
cols-diff 45 46

# Export to clipboard
cols-clip pipe tsv
```

## Shell-Specific Features

### Bash Integration (`shell-integration.bash`)

```bash
# Smart tab completion
_cols_complete()  # Enhanced completion function

# Key binding
bind -x '"\C-g": cols-fzf'  # Ctrl+G for column picker

# Aliases
c, cg, cs, cf, ci, cm, cd, cx
ct, ccf, ccr, cc, cv
```

### Zsh Integration (`shell-integration.zsh`)

```bash
# Widgets (Alt+C, Alt+Z, Alt+I)
cols-fzf-widget
cols-zone-widget
cols-insert-widget

# Enhanced completions with descriptions
_cols_zsh_complete()

# Prompt integration
cols-set-prompt 45

# Additional aliases
cmulti  # Multi-select
```

### Fish Integration (`column-standards-completion.fish`)

```fish
# Native fish completions
complete -c matrix-cols -a "list get search ..."

# Install:
cp column-standards-completion.fish ~/.config/fish/completions/matrix-cols.fish
```

## VS Code Integration

Generate VS Code configurations:

```bash
# Generate tasks
bun matrix/vscode-extension.ts tasks > .vscode/tasks.json

# Generate snippets
bun matrix/vscode-extension.ts snippets > .vscode/snippets.json

# Generate all
bun matrix/vscode-extension.ts all
```

Features:
- Custom terminal profile with shell integration
- Code snippets for TypeScript/JavaScript
- Debug configurations
- Task runner integration

## Examples

### Interactive Column Exploration

```bash
# Pick column interactively
cols get  # Opens fzf picker

# Or use key binding (Alt+C in Zsh)
# Type partial command, press Alt+C
```

### Multi-Column Operations

```bash
# Select multiple columns
cols-fzf-multi | while read col; do
    echo "Processing: $col"
    bun matrix:cols get "$col" --json
done
```

### Watch Mode

```bash
# Watch column 45 (updates every 2 seconds)
cols-watch-column 45

# Watch in background, stop with Ctrl+C
```

### Compare Columns

```bash
# Diff two columns (uses delta if available)
cols-diff 45 46

# Output:
#   [TENSION-PROFILE-LINK vs CF-PROFILE-LINK]
```

### Clipboard Integration

```bash
# Copy column details to clipboard
cols-clip get 45

# Paste into documentation
```

## Customization

### Environment Variables

```bash
# Set matrix:cols home directory
export MATRIX_COLS_HOME="/path/to/matrix"

# Disable fzf integration
export MATRIX_COLS_NO_FZF=1

# Custom fzf options
export MATRIX_COLS_FZF_OPTS="--height 90% --layout reverse-list"
```

### Custom Aliases

Add to your shell config after sourcing the integration:

```bash
# Custom shortcuts
alias myfav='cols get 45'
alias tension-summary='cols find zone=tension | head -10'
```

## Troubleshooting

### FZF not found

```bash
# Install fzf
brew install fzf
# or
apt-get install fzf
```

### Completions not working

```bash
# Bash - reload config
source ~/.bashrc

# Zsh - rebuild compdump
rm ~/.zcompdump*
exec zsh

# Fish - reload completions
exec fish
```

### Key bindings not working

```bash
# Check terminal sends correct sequences
cat -v  # Press key combination

# Bind manually
bindkey '^[c' cols-fzf-widget  # Alt+C
```

## Dependencies

| Tool | Optional | Purpose |
|------|----------|---------|
| fzf | ✅ | Interactive column picking |
| jq | ✅ | JSON processing in examples |
| delta | ✅ | Beautiful diff output |
| pbcopy/xclip | ✅ | Clipboard integration |

## Files

```
matrix/
├── shell-integration.bash    # Bash integration
├── shell-integration.zsh     # Zsh integration  
├── column-standards-completion.fish  # Fish completions
├── vscode-extension.ts       # VS Code helper
└── SHELL-INTEGRATION.md      # This file
```

## Links

- [fzf](https://github.com/junegunn/fzf)
- [delta](https://github.com/dandavison/delta)
- [Bun shell docs](https://bun.sh/docs/runtime/shell)

## Tips

1. **Use `cx` for quick column lookup**: Just type `cx` and search
2. **Set prompt context**: After `cols get 45`, column shows in RPROMPT
3. **Multi-select with Tab**: In `cols-fzf-multi`, Tab selects multiple
4. **Preview window**: Shows column details as you navigate
5. **Copy to clipboard**: Alt+Y in fzf copies column name
