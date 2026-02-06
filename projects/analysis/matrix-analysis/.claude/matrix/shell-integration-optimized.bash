#!/bin/bash
# Tier-1380 OMEGA: Optimized Shell Integration
# Caching layer for faster completions and repeated operations

export MATRIX_COLS_HOME="${MATRIX_COLS_HOME:-$(dirname "$(realpath "${BASH_SOURCE[0]}")')}"
export MATRIX_COLS_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/matrix-cols"
export MATRIX_COLS_CACHE_TTL="${MATRIX_COLS_CACHE_TTL:-300}"  # 5 minutes default

# Ensure cache directory exists
mkdir -p "$MATRIX_COLS_CACHE_DIR"

# ═════════════════════════════════════════════════════════════════════════════
# CACHING LAYER
# ═════════════════════════════════════════════════════════════════════════════

# Check if cache is valid
cache_valid() {
    local cache_file="$1"
    local ttl="${2:-$MATRIX_COLS_CACHE_TTL}"
    
    if [[ ! -f "$cache_file" ]]; then
        return 1
    fi
    
    local age=$(($(date +%s) - $(stat -f %m "$cache_file" 2>/dev/null || stat -c %Y "$cache_file" 2>/dev/null || echo 0)))
    [[ $age -lt $ttl ]]
}

# Get cached column list (speeds up completions)
cols_cached_names() {
    local cache="$MATRIX_COLS_CACHE_DIR/column-names.txt"
    
    if ! cache_valid "$cache"; then
        bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names > "$cache" 2>/dev/null
    fi
    
    cat "$cache" 2>/dev/null
}

# Get cached column IDs
cols_cached_ids() {
    local cache="$MATRIX_COLS_CACHE_DIR/column-ids.txt"
    
    if ! cache_valid "$cache"; then
        bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe ids > "$cache" 2>/dev/null
    fi
    
    cat "$cache" 2>/dev/null
}

# Get cached column details (individual cache per column)
cols_cached_get() {
    local col="$1"
    local cache="$MATRIX_COLS_CACHE_DIR/column-${col}.txt"
    
    if ! cache_valid "$cache" 3600; then  # 1 hour TTL for column details
        bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col" --no-color > "$cache" 2>/dev/null
    fi
    
    cat "$cache" 2>/dev/null
}

# Clear all caches
cols_cache_clear() {
    rm -rf "$MATRIX_COLS_CACHE_DIR"
    mkdir -p "$MATRIX_COLS_CACHE_DIR"
    echo "✅ Cache cleared"
}

# Show cache status
cols_cache_status() {
    echo "🔥 Matrix Columns Cache Status"
    echo "================================"
    echo "Cache dir: $MATRIX_COLS_CACHE_DIR"
    echo ""
    
    if [[ -d "$MATRIX_COLS_CACHE_DIR" ]]; then
        local count=$(find "$MATRIX_COLS_CACHE_DIR" -type f 2>/dev/null | wc -l)
        local size=$(du -sh "$MATRIX_COLS_CACHE_DIR" 2>/dev/null | cut -f1)
        echo "Files: $count"
        echo "Size: $size"
        echo ""
        echo "Cached files:"
        ls -la "$MATRIX_COLS_CACHE_DIR" 2>/dev/null | tail -n +4
    else
        echo "Cache directory empty"
    fi
}

# ═════════════════════════════════════════════════════════════════════════════
# OPTIMIZED COMMANDS
# ═════════════════════════════════════════════════════════════════════════════

# Fast column getter with cache
cols-fast() {
    local cmd="$1"
    shift
    
    case "$cmd" in
        "get"|"g")
            if [[ -z "$1" ]]; then
                echo "Usage: cols-fast get <col>"
                return 1
            fi
            cols_cached_get "$1"
            ;;
        "list"|"ls")
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" list "$@"
            ;;
        "names")
            cols_cached_names
            ;;
        "ids")
            cols_cached_ids
            ;;
        "cache-clear"|"cc")
            cols_cache_clear
            ;;
        "cache-status"|"cs")
            cols_cache_status
            ;;
        *)
            bun "$MATRIX_COLS_HOME/column-standards-all.ts" "$cmd" "$@"
            ;;
    esac
}

# ═════════════════════════════════════════════════════════════════════════════
# OPTIMIZED FZF (with cache)
# ═════════════════════════════════════════════════════════════════════════════

cols-fzf-fast() {
    if ! command -v fzf &> /dev/null; then
        echo "❌ fzf not installed"
        return 1
    fi
    
    local cache="$MATRIX_COLS_CACHE_DIR/column-names.txt"
    
    # Warm cache if needed
    if ! cache_valid "$cache"; then
        cols_cached_names > /dev/null
    fi
    
    # Use cached file directly (avoid pipe overhead)
    fzf --height 80% --layout reverse --border \
        --prompt "🔥 Select Column: " \
        --preview "cat $MATRIX_COLS_CACHE_DIR/column-{}.txt 2>/dev/null || bun $MATRIX_COLS_HOME/column-standards-all.ts get {} --no-color" \
        --preview-window right:50%:wrap < "$cache"
}

# ═════════════════════════════════════════════════════════════════════════════
# OPTIMIZED COMPLETIONS (cached)
# ═════════════════════════════════════════════════════════════════════════════

_cols_complete_fast() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local prev="${COMP_WORDS[COMP_CWORD-1]}"
    
    # Use cached column IDs for get command
    if [[ "$prev" == "get" || "$prev" == "g" ]]; then
        COMPREPLY=( $(compgen -W "$(cols_cached_ids)" -- "$cur") )
        return 0
    fi
    
    # Use cached names for other commands
    if [[ "$prev" == "cols-fast" ]]; then
        COMPREPLY=( $(compgen -W "$(cols_cached_names | head -50)" -- "$cur") )
        return 0
    fi
    
    # Default commands
    COMPREPLY=( $(compgen -W "get list names ids cache-clear cache-status" -- "$cur") )
}

complete -F _cols_complete_fast cols-fast

# ═════════════════════════════════════════════════════════════════════════════
# LAZY LOADING (speed up shell startup)
# ═════════════════════════════════════════════════════════════════════════════

# Only load full integration on first use
cols() {
    # Remove this stub
    unset -f cols
    
    # Source full integration
    source "$MATRIX_COLS_HOME/shell-integration.bash"
    
    # Call real function
    cols "$@"
}

# ═════════════════════════════════════════════════════════════════════════════
# PERFORMANCE MONITORING
# ═════════════════════════════════════════════════════════════════════════════

cols-benchmark() {
    echo "🔥 Shell Integration Benchmark (Optimized)"
    echo "=========================================="
    echo ""
    
    # Cold start (no cache)
    echo "Cold start (first call):"
    time (cols_cache_clear && cols_cached_names > /dev/null)
    echo ""
    
    # Warm cache
    echo "Warm cache (cached names):"
    time cols_cached_names > /dev/null
    echo ""
    
    # Comparison
    echo "Direct vs Cached:"
    echo "  Direct:"
    time bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names > /dev/null
    echo "  Cached:"
    time cols_cached_names > /dev/null
    echo ""
    
    cols_cache_status
}

# ═════════════════════════════════════════════════════════════════════════════
# AUTO-CACHE WARMING
# ═════════════════════════════════════════════════════════════════════════════

# Warm cache in background on shell startup
(w cols_cached_names > /dev/null 2>&1 &)
(w cols_cached_ids > /dev/null 2>&1 &)

echo "🔥 Tier-1380 OMEGA Optimized Shell Integration Loaded"
echo "   Cache: $MATRIX_COLS_CACHE_DIR"
echo "   TTL: ${MATRIX_COLS_CACHE_TTL}s"
echo "   Commands: cols-fast, cols-fzf-fast, cols-cache-clear"
echo "   Benchmark: cols-benchmark"
