#!/bin/zsh
# Tier-1380 OMEGA: Async Zsh Integration
# Non-blocking, background-loaded integration for instant startup

export MATRIX_COLS_HOME="${MATRIX_COLS_HOME:-$(dirname "${(%):-%N}")}"
export MATRIX_COLS_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/matrix-cols"

# Ensure cache directory
mkdir -p "$MATRIX_COLS_CACHE_DIR"

# ═════════════════════════════════════════════════════════════════════════════
# ASYNC LOADING (zsh-async)
# ═════════════════════════════════════════════════════════════════════════════

# Initialize async if available
if (( $+functions[async_init] )); then
  async_init
elif [[ -f "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-async/async.zsh" ]]; then
  source "${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-async/async.zsh"
fi

# Register worker
async_register_worker matrix_cols_worker -u -n

# Callback for async operations
_cols_async_callback() {
  local job=$1
  local return_code=$2
  local output=$3
  local exec_time=$4
  local stderr=$5
  
  case "$job" in
    "warm_cache")
      # Cache warmed in background
      ;;
    "get_column")
      # Display result
      echo "$output"
      ;;
  esac
}

# ═════════════════════════════════════════════════════════════════════════════
# INSTANT STUBS (No loading delay)
# ═════════════════════════════════════════════════════════════════════════════

# Stub that loads full integration on first use
cols() {
  # Start background cache warm
  if (( $+functions[async_job] )); then
    async_job matrix_cols_worker warm_cache "bun $MATRIX_COLS_HOME/column-standards-all.ts pipe names > $MATRIX_COLS_CACHE_DIR/column-names.txt"
  fi
  
  # Load real implementation
  unset -f cols cols-get cols-list cols-search cols-find 2>/dev/null
  source "$MATRIX_COLS_HOME/shell-integration-optimized.bash"
  
  # Call real function
  cols "$@"
}

# Async get column (non-blocking)
cols-get-async() {
  local col="$1"
  local callback="${2:-echo}"
  
  if (( $+functions[async_job] )); then
    async_job matrix_cols_worker get_column "$callback" "bun $MATRIX_COLS_HOME/column-standards-all.ts get $col --no-color"
    echo "⏳ Loading column $col..."
  else
    # Fallback to sync
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col"
  fi
}

# ═════════════════════════════════════════════════════════════════════════════
# DEFERRED COMPLETIONS
# ═════════════════════════════════════════════════════════════════════════════

# Fast path completions (no bun spawn)
_cols_complete_instant() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  
  # Use static cache if available
  if [[ -f "$MATRIX_COLS_CACHE_DIR/column-ids.txt" ]]; then
    COMPREPLY=( $(compgen -W "$(cat "$MATRIX_COLS_CACHE_DIR/column-ids.txt")" -- "$cur") )
    return 0
  fi
  
  # Fallback: basic completion
  COMPREPLY=( $(compgen -W "0 1 2 3 4 5 6 7 8 9 10 31 45" -- "$cur") )
}

# Register completion immediately
complete -F _cols_complete_instant cols

# Background load full completions
(
  sleep 2  # Wait for shell to fully load
  bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe ids > "$MATRIX_COLS_CACHE_DIR/column-ids.txt" 2>/dev/null
  complete -F _cols_complete_instant cols  # Re-register with full cache
) &

# ═════════════════════════════════════════════════════════════════════════════
# RPROMPT ASYNC UPDATE
# ═════════════════════════════════════════════════════════════════════════════

typeset -g MATRIX_RPROMPT_COL=""
typeset -g MATRIX_RPROMPT_LOADING=0

# Async RPROMPT update
cols-set-rprompt-async() {
  local col="$1"
  
  if [[ -z "$col" ]]; then
    MATRIX_RPROMPT_COL=""
    return
  fi
  
  MATRIX_RPROMPT_LOADING=1
  
  if (( $+functions[async_job] )); then
    async_job matrix_cols_worker rprompt_update "cols_async_rprompt_callback" \
      "bun $MATRIX_COLS_HOME/column-standards-all.ts get $col --json | jq -r '[.index, .name] | @tsv'"
  else
    # Sync fallback
    local name=$(bun "$MATRIX_COLS_HOME/column-standards-all.ts" get "$col" --json 2>/dev/null | jq -r '.name')
    MATRIX_RPROMPT_COL="🔥 $col:$name"
    MATRIX_RPROMPT_LOADING=0
  fi
}

cols_async_rprompt_callback() {
  local output="$3"
  if [[ -n "$output" ]]; then
    local idx=$(echo "$output" | cut -f1)
    local name=$(echo "$output" | cut -f2)
    MATRIX_RPROMPT_COL="🔥 $idx:$name"
  fi
  MATRIX_RPROMPT_LOADING=0
  zle && zle reset-prompt
}

# RPROMPT function
matrix_rprompt() {
  if [[ $MATRIX_RPROMPT_LOADING -eq 1 ]]; then
    echo "⏳"
  elif [[ -n "$MATRIX_RPROMPT_COL" ]]; then
    echo "%F{208}$MATRIX_RPROMPT_COL%f"
  fi
}

# Set RPROMPT
RPROMPT='$(matrix_rprompt)'

# ═════════════════════════════════════════════════════════════════════════════
# STREAMING OUTPUT (for large results)
# ═════════════════════════════════════════════════════════════════════════════

cols-stream() {
  local cmd="$1"
  shift
  
  # Use coproc for streaming
  coproc COLS_STREAM {
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" "$cmd" "$@"
  }
  
  # Read and display progressively
  local line
  while IFS= read -r line <&p; do
    echo "$line"
  done
  
  wait
}

# ═════════════════════════════════════════════════════════════════════════════
# NOTIFICATIONS (when long operations complete)
# ═════════════════════════════════════════════════════════════════════════════

cols-notify() {
  local title="$1"
  local message="$2"
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    osascript -e "display notification \"$message\" with title \"$title\"" 2>/dev/null
  elif command -v notify-send &> /dev/null; then
    notify-send "$title" "$message" 2>/dev/null
  fi
}

# Async operation with notification
cols-long-operation() {
  local operation="$1"
  shift
  
  (
    local start=$(date +%s)
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" "$operation" "$@" > /tmp/cols-output-$$
    local duration=$(($(date +%s) - start))
    
    cols-notify "🔥 Matrix:cols" "Operation '$operation' complete (${duration}s)"
    
    # Show result
    cat /tmp/cols-output-$$
    rm -f /tmp/cols-output-$$
  ) &
  
  echo "⏳ Running '$operation' in background..."
}

# ═════════════════════════════════════════════════════════════════════════════
# ZLE WIDGETS (async)
# ═════════════════════════════════════════════════════════════════════════════

# Async column picker
cols-fzf-async-widget() {
  # Use pre-generated cache
  local cache="$MATRIX_COLS_CACHE_DIR/column-names.txt"
  
  # Ensure cache exists
  if [[ ! -f "$cache" ]]; then
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names > "$cache" 2>/dev/null
  fi
  
  # Non-blocking fzf
  (
    local col=$(fzf --height 40% < "$cache")
    if [[ -n "$col" ]]; then
      # Insert result
      print -z "$col"
    fi
  ) &
}

zle -N cols-fzf-async-widget
bindkey '^[a' cols-fzf-async-widget  # Alt+A for async picker

# ═════════════════════════════════════════════════════════════════════════════
# INITIALIZATION
# ═════════════════════════════════════════════════════════════════════════════

# Background cache warm (non-blocking)
(
  sleep 0.5  # Defer to let shell load
  [[ ! -f "$MATRIX_COLS_CACHE_DIR/column-names.txt" ]] && \
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe names > "$MATRIX_COLS_CACHE_DIR/column-names.txt" 2>/dev/null
  [[ ! -f "$MATRIX_COLS_CACHE_DIR/column-ids.txt" ]] && \
    bun "$MATRIX_COLS_HOME/column-standards-all.ts" pipe ids > "$MATRIX_COLS_CACHE_DIR/column-ids.txt" 2>/dev/null
) &!

echo "🔥 Tier-1380 OMEGA Async Zsh Integration Loaded"
echo "   Features: Async loading, deferred completions, streaming output"
echo "   Key bindings: Alt+A (async picker)"
