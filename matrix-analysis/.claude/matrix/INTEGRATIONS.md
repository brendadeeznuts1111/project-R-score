# 🔥 Tier-1380 OMEGA: Advanced Integrations Guide

> Beyond the CLI: tmux, git, editors, launchers, and CI/CD

## Table of Contents

- [Tmux Integration](#tmux-integration)
- [Git Hooks](#git-hooks)
- [Neovim Plugin](#neovim-plugin)
- [Emacs Integration](#emacs-integration)
- [Raycast Extension](#raycast-extension)
- [GitHub Actions](#github-actions)
- [Quick Reference](#quick-reference)

---

## Tmux Integration

### Features
- Show current column in tmux status bar
- Column picker popup (prefix + c)
- Per-session column context

### Setup

Add to `~/.tmux.conf`:

```bash
# Show column in status bar
set -g status-right '#(~/path/to/matrix/tmux-integration.sh status) #[default]'
set -g status-interval 5

# Key bindings
bind-key c run-shell '~/path/to/matrix/tmux-integration.sh popup'
bind-key C run-shell '~/path/to/matrix/tmux-integration.sh clear'
```

### Commands

```bash
# Check status
tmux run-shell '~/matrix/tmux-integration.sh status'

# Set column for session
tmux run-shell '~/matrix/tmux-integration.sh set 45'

# Clear
tmux run-shell '~/matrix/tmux-integration.sh clear'

# Popup picker
tmux run-shell '~/matrix/tmux-integration.sh popup'
```

---

## Git Hooks

### Features
- Validate column references in commits
- Auto-add column context to commit messages
- Branch-based column detection

### Setup

```bash
# Install hooks
cd your-repo
bash ~/matrix/git-hooks.sh install
```

### What It Does

1. **pre-commit**: Validates column references in staged files
2. **commit-msg**: Checks column references in commit message
3. **prepare-commit-msg**: Adds column context if `MATRIX_CURRENT_COL` is set
4. **post-checkout**: Shows column info when switching to column-related branches

### Usage

```bash
# Commit with column reference
git commit -m "Fix Col(45) tension profile link"

# The hook will validate that Col(45) exists
```

---

## Neovim Plugin

### Features
- FZF/Telescope integration for fuzzy column picking
- Floating window previews
- Column under cursor (gd to go to definition)
- Native Lua plugin

### Installation

#### Using lazy.nvim

```lua
{
  dir = "~/path/to/matrix",
  name = "matrix-cols",
  config = function()
    require("matrix-cols").setup({
      cli_path = vim.fn.expand("~/matrix/column-standards-all.ts"),
      keymaps = {
        open = "<leader>mc",
        search = "<leader>ms",
      }
    })
  end,
  keys = {
    { "<leader>mc", function() require("matrix-cols").open_picker() end, desc = "Matrix columns" },
    { "gd", function() require("matrix-cols").get_column_under_cursor() end, desc = "Go to column" },
  }
}
```

#### Using packer.nvim

```lua
use {
  '~/path/to/matrix',
  config = function()
    require('matrix-cols').setup()
  end
}
```

### Commands

| Command | Description |
|---------|-------------|
| `:MatrixCols` | Open column picker |
| `:MatrixGet 45` | Show column 45 |
| `:MatrixSearch tension` | Search columns |
| `:MatrixZone tension` | Show zone |

### Key Bindings (in picker)

| Key | Action |
|-----|--------|
| `<CR>` | Show column |
| `<C-o>` | Preview in floating window |
| `<C-y>` | Yank column name |

---

## Emacs Integration

### Features
- Custom major mode for matrix output
- Interactive commands
- Completing-read integration

### Setup

```elisp
;; Add to init.el
(add-to-list 'load-path "~/path/to/matrix")
(require 'matrix-cols)
(setq matrix-cols-cli-path "~/matrix/column-standards-all.ts")
```

### Commands

| Command | Key | Description |
|---------|-----|-------------|
| `matrix-cols-get` | `C-c m c` | Get column details |
| `matrix-cols-list` | `C-c m l` | List all columns |
| `matrix-cols-search` | `C-c m s` | Search columns |
| `matrix-cols-zone` | `C-c m z` | Show zone |
| `matrix-cols-matrix` | `C-c m g` | Show matrix grid |
| `matrix-cols-doctor` | `C-c m d` | Environment check |

---

## Raycast Extension

### Features
- Quick column search
- Zone commands
- Copy to clipboard
- Detail view

### Setup

1. Copy `raycast-extension.tsx` to your Raycast extensions directory
2. Update `CLI_PATH` to point to your installation
3. Build and install in Raycast

### Commands

| Command | Description |
|---------|-------------|
| `Matrix Columns` | Search all columns |
| `Tension Zone` | Tension zone columns |
| `Cloudflare Zone` | Cloudflare zone columns |
| `Chrome Zone` | Chrome state columns |

---

## GitHub Actions

### Features
- Automated testing on push/PR
- Schema validation
- Documentation generation
- Stats reporting

### Setup

Copy `github-actions-example.yml` to `.github/workflows/matrix-cols.yml`:

```bash
cp ~/matrix/github-actions-example.yml .github/workflows/matrix-cols.yml
```

### Workflow Jobs

| Job | Purpose |
|-----|---------|
| `test` | Run test suite |
| `lint` | TypeScript & formatting checks |
| `stats` | Generate matrix statistics |
| `publish-docs` | Deploy docs to GitHub Pages |

### Usage

The workflow runs automatically on push/PR to `main` branch when matrix files change.

---

## Quick Reference

### File Locations

```
matrix/
├── tmux-integration.sh          # Tmux integration
├── git-hooks.sh                 # Git hooks
├── nvim-plugin.lua              # Neovim plugin
├── emacs-integration.el         # Emacs integration
├── raycast-extension.tsx        # Raycast extension
└── github-actions-example.yml   # GitHub Actions
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `MATRIX_COLS_HOME` | Path to matrix directory |
| `MATRIX_CURRENT_COL` | Currently selected column (for prompts) |

### Key Bindings Summary

| Integration | Key | Action |
|-------------|-----|--------|
| Tmux | `prefix + c` | Column picker |
| Tmux | `prefix + C` | Clear column |
| Neovim | `<leader>mc` | Column picker |
| Neovim | `gd` | Go to column under cursor |
| Emacs | `C-c m c` | Get column |
| Emacs | `C-c m l` | List columns |

### Integration Matrix

| Feature | Bash/Zsh | Tmux | Git | Neovim | Emacs | Raycast | CI/CD |
|---------|----------|------|-----|--------|-------|---------|-------|
| Column picker | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Status display | ✅ (RPROMPT) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Validation | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Preview | ✅ (fzf) | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Auto-complete | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ |

---

## Tips

### Combine Integrations

```bash
# In Zsh + Tmux
$ cols get 45          # Sets MATRIX_CURRENT_COL
# Shows in RPROMPT and tmux status bar

# Commit with context
$ git commit -m "Fix"
# Hook automatically adds: 🔥 Related: Col(45) - tension-profile-link
```

### Editor + Shell Workflow

```bash
# Terminal
$ cols-fzf              # Pick column interactively
# Shows in RPROMPT: 🔥 45:tension-profile-link

# In Neovim/Emacs
# Press gd on "Col(45)" to jump to details
```

### CI/CD + Local Dev

```bash
# Local validation
$ bun run matrix:test

# Push triggers CI
# - Tests run
# - Schema validated
# - Docs published
# - Stats reported
```

---

## Links

- [Tmux](https://github.com/tmux/tmux)
- [Neovim](https://neovim.io/)
- [Emacs](https://www.gnu.org/software/emacs/)
- [Raycast](https://www.raycast.com/)
- [GitHub Actions](https://github.com/features/actions)
