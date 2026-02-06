#!/bin/bash
# Tier-1380 OMEGA: Enhanced Bash/Zsh Integration for matrix:cols
# Source this in ~/.bashrc or ~/.zshrc: source /path/to/shell-integration.bash

# Configuration
export MATRIX_COLS_HOME="${MATRIX_COLS_HOME:-$(dirname "$(realpath "${BASH_SOURCE[0]}")')}"

# ═════════════════════════════════════════════════════════════════════════════
# CORE FUNCTIONS (More powerful than aliases)
# ═════════════════════════════════════════════════════════════════════════════

# Smart column getter with fuzzy completion
cols() {
    local cmd="$1"
    shift
    
    case "$cmd" in
        ""|"list"|"ls")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" list "$@"
            ;;
        "get"|"g")
            if [[ -z "$1" ]]; then
                # Interactive column picker with fzf if available
                if command -v fzf &> /dev/null; then
                    local col
                    col=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names | fzf --prompt="Select column: " --preview="bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --no-color")
                    [[ -n "$col" ]] && bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col"
                else
                    bun "$MATRIX_COLS_HOME/column-standards-all.ts" get --help
                fi
            else
                bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$@"
            fi
            ;;
        "search"|"s")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" search "$@"
            ;;
        "find"|"f")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" find "$@"
            ;;
        "fav"|"favorite"|"⭐")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" fav "$@"
            ;;
        "interactive"|"i"|"repl")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" interactive
            ;;
        "tension"|"t")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" tension
            ;;
        "cloudflare"|"cf")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" cloudflare
            ;;
        "chrome"|"cr")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" chrome
            ;;
        "matrix"|"m"|"grid")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" matrix
            ;;
        "doctor"|"doc"|"check")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" doctor
            ;;
        "export"|"e")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" export "$@"
            ;;
        "pipe"|"p")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe "$@"
            ;;
        "help"|"h"|"-h"|"--help")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" --help
            ;;
        [0-9]|[0-9][0-9])
            # Direct column number
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$cmd"
            ;;
        *)
            # Pass through to CLI
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" "$cmd" "$@"
            ;;
    esac
}

# ═════════════════════════════════════════════════════════════════════════════
# FZF INTEGRATION
# ═════════════════════════════════════════════════════════════════════════════

# Fuzzy find columns with preview
cols-fzf() {
    if ! command -v fzf &> /dev/null; then
        echo "❌ fzf not installed. Install with: brew install fzf"
        return 1
    fi
    
    local preview_cmd="bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --no-color 2>/dev/null || echo 'Select a column'"
    
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names | \
        fzf --height 80% \
            --layout reverse \
            --border \
            --prompt "🔥 Select Column: " \
            --preview "$preview_cmd" \
            --preview-window right:50%:wrap \
            --header "Ctrl-O: Open | Ctrl-Y: Copy | Enter: Details" \
            --bind "ctrl-o:execute(bun $MATRIX_COLS_HOME/column-standards-all.ts preview {} --no-color)" \
            --bind "ctrl-y:execute-silent(bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --json | jq -r '.name' | pbcopy)" \
            --bind "enter:execute(bun $MATRIX_COLS_HOME/column-standards-all.ts get {})"
}

# Fuzzy find with zone filter
cols-fzf-zone() {
    local zone="${1:-tension}"
    if ! command -v fzf &> /dev/null; then
        echo "❌ fzf not installed"
        return 1
    fi
    
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" find zone="$zone" --json 2>/dev/null | \
        jq -r '.[].name' | \
        fzf --prompt "🔥 $zone columns: " \
            --preview "bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --no-color"
}

# ═════════════════════════════════════════════════════════════════════════════
# KEY BINDINGS (Bash/Zsh)
# ═════════════════════════════════════════════════════════════════════════════

# Ctrl+G: Quick column picker (if fzf available)
if command -v fzf &> /dev/null; then
    bind -x '"\C-g": cols-fzf' 2>/dev/null || bindkey -s '^g' 'cols-fzf\n' 2>/dev/null
fi

# ═════════════════════════════════════════════════════════════════════════════
# SMART COMPLETION
# ═════════════════════════════════════════════════════════════════════════════

# Enhanced completion for the cols function
_cols_complete() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # Complete column IDs for get command
    if [[ "$prev" == "get" || "$prev" == "g" ]]; then
        COMPREPLY=( $(compgen -W "$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe ids 2>/dev/null)" -- "$cur") )
        return 0
    fi
    
    # Complete zones for zone commands
    if [[ "$prev" == "zone" || "$prev" == "find" ]]; then
        COMPREPLY=( $(compgen -W "default core security cloudflare tension infra validation extensibility skills chrome" -- "$cur") )
        return 0
    fi
    
    # Main commands
    COMPREPLY=( $(compgen -W "get g search s find f fav interactive i tension t cloudflare cf chrome cr matrix m doctor doc export e pipe p list ls help h" -- "$cur") )
}

complete -F _cols_complete cols

# ═════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═════════════════════════════════════════════════════════════════════════════

# Copy column name to clipboard
cols-copy() {
    local col="$1"
    if [[ -z "$col" ]]; then
        echo "Usage: cols-copy <column-id-or-name>"
        return 1
    fi
    
    # If numeric, get name
    if [[ "$col" =~ ^[0-9]+$ ]]; then
        col=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col" --json 2>/dev/null | jq -r '.name')
    fi
    
    echo -n "$col" | pbcopy 2>/dev/null || echo -n "$col" | xclip -selection clipboard 2>/dev/null || echo -n "$col" > /dev/clipboard 2>/dev/null
    echo "✅ Copied: $col"
}

# Watch column for changes
cols-watch-column() {
    local col="$1"
    if [[ -z "$col" ]]; then
        echo "Usage: cols-watch-column <column-id>"
        return 1
    fi
    
    echo "👁️  Watching column $col (Ctrl+C to stop)..."
    while true; do
        clear
        bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col"
        echo ""
        echo "Last updated: $(date)"
        sleep 2
    done
}

# Compare two columns
cols-diff() {
    local col1="$1"
    local col2="$2"
    
    if [[ -z "$col1" || -z "$col2" ]]; then
        echo "Usage: cols-diff <col1> <col2>"
        return 1
    fi
    
    if command -v delta &> /dev/null; then
        diff <(bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col1" --no-color) \
             <(bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col2" --no-color) | delta --file-style raw
    else
        diff <(bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col1" --no-color) \
             <(bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col2" --no-color)
    fi
}

# Export to clipboard
cols-clip() {
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" "$@" | pbcopy 2>/dev/null || bun "$MATRIX_COLS_HOME/column-standards-all.ts" "$@" | xclip -selection clipboard 2>/dev/null
    echo "✅ Output copied to clipboard"
}

# ═════════════════════════════════════════════════════════════════════════════
# ALIASES (Quick access)
# ═════════════════════════════════════════════════════════════════════════════

alias c='cols'
alias cg='cols get'
alias cs='cols search'
alias cf='cols find'
alias ci='cols interactive'
alias cm='cols matrix'
alias cd='cols doctor'
alias cx='cols-fzf'

# Zone shortcuts
alias ct='cols tension'
alias ccf='cols cloudflare'
alias ccr='cols chrome'
alias cc='cols core'
alias cv='cols validation'

echo "🔥 Tier-1380 OMEGA Shell Integration Loaded"
echo "   Commands: cols, cols-fzf, cols-diff, cols-watch-column"
echo "   Aliases: c, cg, cs, cf, ci, cm, cd, cx"
echo "   Shortcuts: ct, ccf, ccr, cc, cv"
