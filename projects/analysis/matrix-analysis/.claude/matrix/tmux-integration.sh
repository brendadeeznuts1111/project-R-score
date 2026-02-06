#!/bin/bash
# Tier-1380 OMEGA: Tmux Integration
# Shows current column context in tmux status bar

# Add to tmux.conf:
# set -g status-right '#(~/path/to/tmux-integration.sh status)'
# set -g status-interval 5

MATRIX_COLS_HOME="${MATRIX_COLS_HOME:-$(dirname "$0")}"
CACHE_FILE="/tmp/matrix-cols-tmux-$$"

# Get current column from environment or cache
cols_tmux_status() {
    local col="${MATRIX_CURRENT_COL:-$(cat "$CACHE_FILE" 2>/dev/null)}"
    
    if [ -n "$col" ]; then
        # Extract just the emoji and number for compact display
        local compact=$(echo "$col" | sed 's/🔥 //' | cut -d: -f1)
        echo "🔥 $compact"
    else
        echo ""
    fi
}

# Set column for this tmux session
cols_tmux_set() {
    local col="$1"
    echo "$col" > "$CACHE_FILE"
    export MATRIX_CURRENT_COL="$col"
    
    # Update all panes in current session
    tmux set-environment -t "$(tmux display-message -p '#{session_name}')" MATRIX_CURRENT_COL "$col"
}

# Clear column
cols_tmux_clear() {
    rm -f "$CACHE_FILE"
    unset MATRIX_CURRENT_COL
    tmux set-environment -u MATRIX_CURRENT_COL
}

# Show column popup
cols_tmux_popup() {
    local col="${1:-$(cat "$CACHE_FILE" 2>/dev/null)}"
    
    if [ -z "$col" ]; then
        # Pick interactively
        col=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names 2>/dev/null | fzf --tmux)
    fi
    
    if [ -n "$col" ]; then
        tmux display-popup -E -w 80% -h 80% \
            "bun $MATRIX_COLS_HOME/column-standards-all.ts get $col"
        cols_tmux_set "$col"
    fi
}

# Key binding handler
cols_tmux_key() {
    case "$1" in
        "prefix+c")
            cols_tmux_popup
            ;;
        "prefix+C")
            cols_tmux_clear
            tmux display-message "🔥 Column context cleared"
            ;;
    esac
}

# Main
case "$1" in
    "status")
        cols_tmux_status
        ;;
    "set")
        cols_tmux_set "$2"
        ;;
    "clear")
        cols_tmux_clear
        ;;
    "popup"|"p")
        cols_tmux_popup "$2"
        ;;
    "key")
        cols_tmux_key "$2"
        ;;
    *)
        echo "Usage: $0 {status|set <col>|clear|popup [col]|key <binding>}"
        ;;
esac
