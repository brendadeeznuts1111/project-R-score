#!/bin/zsh
# Tier-1380 OMEGA: Enhanced Zsh Integration for matrix:cols
# Source this in ~/.zshrc: source /path/to/shell-integration.zsh

export MATRIX_COLS_HOME="${MATRIX_COLS_HOME:-$(dirname "$(realpath "${(%):-%N}")')}"

# ═════════════════════════════════════════════════════════════════════════════
# ZSH-SPECIFIC FEATURES
# ═════════════════════════════════════════════════════════════════════════════

# Function to show current column in RPROMPT
typeset -g MATRIX_CURRENT_COL=""

cols-set-prompt() {
    local col="$1"
    if [[ -z "$col" ]]; then
        MATRIX_CURRENT_COL=""
    else
        local name=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col" --json 2>/dev/null | jq -r '.name // empty')
        if [[ -n "$name" ]]; then
            MATRIX_CURRENT_COL="🔥 $col:$name"
        else
            MATRIX_CURRENT_COL="🔥 $col"
        fi
    fi
}

# Add to RPROMPT
add-zsh-hook precmd _cols_update_prompt
_cols_update_prompt() {
    if [[ -n "$MATRIX_CURRENT_COL" ]]; then
        RPROMPT="%F{208}$MATRIX_CURRENT_COL%f ${RPROMPT_ORIG:-}"
    fi
}

# ═════════════════════════════════════════════════════════════════════════════
# WIDGETS (Zsh line editor integration)
# ═════════════════════════════════════════════════════════════════════════════

# FZF column picker widget
cols-fzf-widget() {
    if ! command -v fzf &> /dev/null; then
        zle -M "❌ fzf not installed"
        return 1
    fi
    
    local col
    col=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names 2>/dev/null | \
        fzf --height 40% --layout reverse --prompt "🔥 Column: " \
            --preview "bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --no-color")
    
    if [[ -n "$col" ]]; then
        LBUFFER+="$col"
    fi
    zle reset-prompt
}
zle -N cols-fzf-widget

# Zone picker widget
cols-zone-widget() {
    local zone
    zone=$(echo -e "tension\ncloudflare\nchrome\ncore\nvalidation\ndefault\nsecurity\ninfra\nextensibility\nskills" | \
        fzf --height 30% --prompt "🔥 Zone: ")
    
    if [[ -n "$zone" ]]; then
        LBUFFER+="$zone"
    fi
    zle reset-prompt
}
zle -N cols-zone-widget

# Insert column name at cursor
cols-insert-widget() {
    local col
    col=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names 2>/dev/null | \
        fzf --height 40% --prompt "🔥 Insert column: ")
    
    if [[ -n "$col" ]]; then
        LBUFFER+="$col"
    fi
    zle reset-prompt
}
zle -N cols-insert-widget

# ═════════════════════════════════════════════════════════════════════════════
# KEY BINDINGS
# ═════════════════════════════════════════════════════════════════════════════

# Alt+C: Column picker
bindkey '\ec' cols-fzf-widget

# Alt+Z: Zone picker  
bindkey '\ez' cols-zone-widget

# Alt+I: Insert column name
bindkey '\ei' cols-insert-widget

# ═════════════════════════════════════════════════════════════════════════════
# ENHANCED COLS FUNCTION
# ═════════════════════════════════════════════════════════════════════════════

cols() {
    local cmd="$1"
    shift
    
    case "$cmd" in
        ""|"list"|"ls")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" list "$@"
            ;;
        "get"|"g")
            if [[ -z "$1" ]]; then
                if command -v fzf &> /dev/null; then
                    local col
                    col=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names 2>/dev/null | \
                        fzf --prompt="Select column: " --preview="bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --no-color")
                    [[ -n "$col" ]] && { bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col"; cols-set-prompt "$col"; }
                else
                    bun "$MATRIX_COLS_HOME/column-standards-all.ts" get --help
                fi
            else
                bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$@"
                cols-set-prompt "$1"
            fi
            ;;
        "search"|"s")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" search "$@"
            ;;
        "find"|"f")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" find "$@"
            ;;
        "fav"|"favorite")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" fav "$@"
            ;;
        "interactive"|"i")
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
        "matrix"|"m")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" matrix
            ;;
        "doctor"|"doc")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" doctor
            ;;
        "clear"|"unset")
            cols-set-prompt ""
            echo "🔥 Column context cleared"
            ;;
        [0-9]|[0-9][0-9])
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$cmd"
            cols-set-prompt "$cmd"
            ;;
        *)
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" "$cmd" "$@"
            ;;
    esac
}

# ═════════════════════════════════════════════════════════════════════════════
# FZF FUNCTIONS
# ═════════════════════════════════════════════════════════════════════════════

cols-fzf() {
    if ! command -v fzf &> /dev/null; then
        echo "❌ fzf not installed"
        return 1
    fi
    
    local preview_cmd="bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --no-color 2>/dev/null"
    
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names 2>/dev/null | \
        fzf --height 80% --layout reverse --border \
            --prompt "🔥 Select Column: " \
            --preview "$preview_cmd" \
            --preview-window right:50%:wrap \
            --header "Alt-O: Open | Alt-Y: Copy | Enter: Details | Ctrl-G: Set Prompt" \
            --bind "alt-o:execute(bun $MATRIX_COLS_HOME/column-standards-all.ts preview {} --no-color)" \
            --bind "alt-y:execute-silent(bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --json | jq -r '.name' | pbcopy)" \
            --bind "ctrl-g:execute-silent(cols-set-prompt {})+abort" \
            --bind "enter:execute(bun $MATRIX_COLS_HOME/column-standards-all.ts get {})+abort"
}

cols-fzf-multi() {
    if ! command -v fzf &> /dev/null; then
        echo "❌ fzf not installed"
        return 1
    fi
    
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names 2>/dev/null | \
        fzf --multi --height 80% \
            --prompt "🔥 Select columns (Tab to multi-select): " \
            --preview "bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --no-color"
}

# ═════════════════════════════════════════════════════════════════════════════
# SYNTAX HIGHLIGHTING INTEGRATION
# ═════════════════════════════════════════════════════════════════════════════

# Add column names to Zsh syntax highlighting if available
if (( $+functions[_zsh_highlight_add_highlighter] )); then
    # Highlight column names in commands
    typeset -a ZSH_HIGHLIGHT_PATTERNS
    ZSH_HIGHLIGHT_PATTERNS+=('tension-profile-link' 'fg=208,bold')
    ZSH_HIGHLIGHT_PATTERNS+=('cf-zone-id' 'fg=141,bold')
    ZSH_HIGHLIGHT_PATTERNS+=('tension-anomaly-score' 'fg=208,bold')
fi

# ═════════════════════════════════════════════════════════════════════════════
# COMPLETIONS
# ═════════════════════════════════════════════════════════════════════════════

# Enhanced Zsh completion
_cols_zsh_complete() {
    local curcontext="$curcontext" state line
    typeset -A opt_args
    
    _arguments -C \
        '(-h --help)'{-h,--help}'[Show help]' \
        '(-v --version)'{-v,--version}'[Show version]' \
        '--json[Output as JSON]' \
        '--no-color[Disable colors]' \
        '1: :_cols_commands' \
        '*:: :->args'
    
    case "$state" in
        args)
            case "$line[1]" in
                get|g)
                    _cols_columns
                    ;;
                find|f)
                    _cols_find_criteria
                    ;;
                pipe|p)
                    _cols_pipe_formats
                    ;;
                *)
                    _files
                    ;;
            esac
            ;;
    esac
}

_cols_commands() {
    local commands=(
        'list:List all columns'
        'get:Get column details'
        'search:Search columns'
        'find:Find by criteria'
        'tension:Tension zone'
        'cloudflare:Cloudflare zone'
        'chrome:Chrome columns'
        'matrix:Show matrix grid'
        'doctor:Environment check'
        'interactive:Interactive mode'
        'fav:Manage favorites'
    )
    _describe -t commands 'cols command' commands
}

_cols_columns() {
    local cols
    cols=(${(f)"$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names 2>/dev/null)"})
    _describe -t columns 'column' cols
}

_cols_find_criteria() {
    local criteria=(
        'zone=:Filter by zone'
        'owner=:Filter by owner'
        'type=:Filter by type'
        'required=:Required flag'
        'has=:Has property'
    )
    _describe -t criteria 'criteria' criteria
}

_cols_pipe_formats() {
    local formats=(tsv csv names ids grep-tags env)
    _describe -t formats 'format' formats
}

compdef _cols_zsh_complete cols

# ═════════════════════════════════════════════════════════════════════════════
# ALIASES
# ═════════════════════════════════════════════════════════════════════════════

alias c='cols'
alias cg='cols get'
alias cs='cols search'
alias cf='cols find'
alias ci='cols interactive'
alias cm='cols matrix'
alias cd='cols doctor'
alias cx='cols-fzf'
alias cmulti='cols-fzf-multi'
alias ct='cols tension'
alias ccf='cols cloudflare'
alias ccr='cols chrome'
alias cc='cols core'
alias cv='cols validation'

echo "🔥 Tier-1380 OMEGA Zsh Integration Loaded"
echo "   Key bindings: Alt+C (column picker), Alt+Z (zone picker), Alt+I (insert)"
echo "   Aliases: c, cg, cs, cf, ci, cm, cd, cx, cmulti"
